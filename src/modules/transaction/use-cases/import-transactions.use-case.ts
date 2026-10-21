import { spDayString, spEndOfDay } from '@core/helpers/dates';
import { BadRequestError } from '@core/errors';
import { logger } from '@core/lib/logger';
import { categoryRepository } from '@modules/category/repositories/category.repository';
import { billingDateFor } from '@modules/account/helpers/billing-date';
import { resolveAccount } from '@modules/account/use-cases/account.use-cases';
import { registerImportedBillPayments } from '@modules/account/use-cases/card-bill-payment.use-cases';
import { financialPeriodService } from '@modules/financial-period';
import { processUserSpendingAlert } from '@modules/notification';
import { transferRepository } from '@modules/transfer/repositories/transfer.repository';
import {
  convertToTransfer,
  findTransferMatches,
} from '@modules/transfer/use-cases/import-transfers.use-case';
import { buildImportCategorySuggester, isBillPayment } from '../helpers/import-category-suggester';
import { parseInterBill, type BillStatement } from '../helpers/inter-bill-parser';
import { decodeOfxFile, parseOfx, type OfxStatement } from '../helpers/ofx-parser';
import { extractPdfText, isPdf } from '../helpers/pdf-text';
import { transactionRepository } from '../repositories/transaction.repository';
import type { ConfirmImportInput } from '../schemas/transaction-import.schema';
import { validateCategoryExistsForUser } from '../validations/transaction.validation';

const TITLE_HISTORY_LIMIT = 2000;

export type ImportItemStatus =
  | 'new'
  | 'imported'
  | 'possible_duplicate'
  | 'bill_payment'
  | 'transfer';

const dayKey = (type: string, amount: number, date: Date) =>
  `${type}:${amount}:${spDayString(date)}`;

export const previewTransactionImportUseCase = async (
  userId: string,
  fileBase64Url: string,
  accountId?: string
) => {
  const bytes = Buffer.from(fileBase64Url, 'base64url');
  let statement: OfxStatement | BillStatement;
  if (isPdf(bytes)) {
    let bill: BillStatement | null = null;
    try {
      bill = parseInterBill(await extractPdfText(bytes));
    } catch (error) {
      logger.warn(`[transactions] PDF text extraction failed: ${(error as Error).message}`);
    }
    if (!bill) {
      throw new BadRequestError('PDF não reconhecido. Por enquanto só a fatura do cartão Inter.');
    }
    statement = bill;
  } else {
    try {
      statement = parseOfx(decodeOfxFile(bytes));
    } catch {
      throw new BadRequestError('Arquivo não é um extrato OFX válido');
    }
  }
  if (statement.transactions.length === 0) {
    throw new BadRequestError('Nenhuma transação encontrada no extrato');
  }

  const times = statement.transactions.map((transaction) => transaction.date.getTime());
  const externalIds = statement.transactions.map((transaction) => transaction.externalId);
  const account = accountId ? await resolveAccount(userId, accountId) : null;
  const [imported, importedAsTransfer, manual, history, categories] = await Promise.all([
    transactionRepository.findImportedExternalIds(userId, externalIds),
    transferRepository.findExternalIds(userId, externalIds),
    transactionRepository.findManualInRange(
      userId,
      new Date(Math.min(...times)),
      spEndOfDay(new Date(Math.max(...times)))
    ),
    transactionRepository.findRecentTitleCategories(userId, TITLE_HISTORY_LIMIT),
    categoryRepository.findByUserId(userId),
  ]);

  const importedIds = new Set([...imported, ...importedAsTransfer]);
  const transferMatches = await findTransferMatches(
    userId,
    account,
    statement.transactions.filter(
      (transaction) =>
        !importedIds.has(transaction.externalId) &&
        !isBillPayment(transaction.title, transaction.type)
    )
  );
  const manualByDay = new Map(
    manual.map((transaction) => [
      dayKey(transaction.type, Number(transaction.amount), transaction.date),
      transaction.id,
    ])
  );
  const suggester = buildImportCategorySuggester(history, categories);

  // Fatura em PDF: toda linha pertence a esta fatura, até parcela de compra antiga.
  const bill =
    'dueDate' in statement ? { dueDate: statement.dueDate, total: statement.total } : null;

  return {
    accountKey: statement.accountKey,
    bill,
    items: statement.transactions.map((transaction) => {
      const duplicateOf = manualByDay.get(
        dayKey(transaction.type, transaction.amount, transaction.date)
      );
      const transferOf = transferMatches.get(transaction.externalId) ?? null;
      const status: ImportItemStatus = importedIds.has(transaction.externalId)
        ? 'imported'
        : isBillPayment(transaction.title, transaction.type)
          ? 'bill_payment'
          : transferOf
            ? 'transfer'
            : duplicateOf
              ? 'possible_duplicate'
              : 'new';

      const suggestion = suggester.suggest(transaction.title, transaction.type);
      return {
        ...transaction,
        status,
        duplicateOf: status === 'possible_duplicate' ? duplicateOf! : null,
        transferOf: status === 'transfer' ? transferOf : null,
        suggestedCategoryId: suggestion.categoryId,
        suggestionSource: suggestion.source,
      };
    }),
  };
};

export const confirmTransactionImportUseCase = async (
  userId: string,
  { items, billPayments, billDueDate, accountId: requestedAccountId }: ConfirmImportInput
) => {
  const account = await resolveAccount(userId, requestedAccountId);
  const transferItems = items.filter((item) => item.transferOf);
  const transactionItems = items.filter((item) => !item.transferOf);
  const categoryIds = [...new Set(transactionItems.map((item) => item.categoryId!))];
  for (const categoryId of categoryIds) await validateCategoryExistsForUser(categoryId, userId);

  // Um período por dia de cobrança, não por linha: extratos têm dezenas de lançamentos no
  // mesmo dia (e numa fatura todas as compras vencem no mesmo dia).
  const periodByDay = new Map<string, string>();
  const rows = [];
  for (const item of transactionItems) {
    const billingDate =
      billDueDate && account.type === 'credit_card'
        ? billDueDate
        : billingDateFor(account, item.date);
    const day = spDayString(billingDate);
    let periodId = periodByDay.get(day);
    if (!periodId) {
      periodId = await financialPeriodService.findOrCreatePeriodForDate(userId, billingDate);
      periodByDay.set(day, periodId);
    }
    rows.push({
      userId,
      type: item.type,
      title: item.title,
      amount: item.amount,
      categoryId: item.categoryId!,
      description: null,
      date: item.date,
      periodId,
      recurringTransactionId: null,
      externalId: item.externalId,
      accountId: account.id,
    });
  }

  // Sem notificação por linha (importar 80 lançamentos não pode virar 80 pushes);
  // o alerta de gasto é reavaliado uma vez por período afetado.
  const created = await transactionRepository.createManyImported(rows);

  const expensePeriods = new Set(
    created.filter((row) => row.type === 'expense' && row.periodId).map((row) => row.periodId!)
  );
  for (const periodId of expensePeriods) {
    try {
      await processUserSpendingAlert(userId, periodId);
    } catch (error) {
      logger.error('[transactions] import spending alert failed', error as Error);
    }
  }

  const billsPaid = await registerImportedBillPayments(userId, account, billPayments);

  for (const item of transferItems) {
    await convertToTransfer(userId, account, { ...item, transferOf: item.transferOf! });
  }

  return {
    created: created.length,
    skipped: transactionItems.length - created.length,
    billsPaid,
    transfers: transferItems.length,
  };
};
