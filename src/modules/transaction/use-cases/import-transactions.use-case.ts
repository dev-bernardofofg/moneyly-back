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
import { reconcile } from '../helpers/reconcile';
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

const RECONCILE_MARGIN_MS = 3 * 24 * 60 * 60 * 1000;

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
  const account = await resolveAccount(userId, accountId);
  const billDueDate = 'dueDate' in statement ? statement.dueDate : null;
  // Fatura no cartão: o que já existe no período dela é candidato, venha de onde vier a data.
  const scope =
    billDueDate && account.type === 'credit_card'
      ? { periodId: await financialPeriodService.findOrCreatePeriodForDate(userId, billDueDate) }
      : {
          start: new Date(Math.min(...times) - RECONCILE_MARGIN_MS),
          end: spEndOfDay(new Date(Math.max(...times) + RECONCILE_MARGIN_MS)),
        };
  const [imported, importedAsTransfer, candidates, history, categories] = await Promise.all([
    transactionRepository.findImportedExternalIds(userId, externalIds),
    transferRepository.findExternalIds(userId, externalIds),
    transactionRepository.findReconcileCandidates(userId, account.id, scope),
    transactionRepository.findRecentTitleCategories(userId, TITLE_HISTORY_LIMIT),
    categoryRepository.findByUserId(userId),
  ]);

  const importedIds = new Set([...imported, ...importedAsTransfer]);
  const pendingRows = statement.transactions.filter(
    (transaction) =>
      !importedIds.has(transaction.externalId) &&
      !isBillPayment(transaction.title, transaction.type)
  );
  // A linha que já foi importada por id não pode "gastar" um candidato de outra linha.
  const linkedIds = new Set(
    candidates.flatMap((c) => (c.externalId && importedIds.has(c.externalId) ? [c.id] : []))
  );
  const matches = reconcile(
    pendingRows,
    candidates.filter((candidate) => !linkedIds.has(candidate.id)),
    { samePeriod: 'periodId' in scope }
  );
  const transferMatches = await findTransferMatches(
    userId,
    account,
    pendingRows.filter((transaction) => !matches.has(transaction.externalId))
  );
  const suggester = buildImportCategorySuggester(history, categories);

  // Fatura em PDF: toda linha pertence a esta fatura, até parcela de compra antiga.
  const bill =
    'dueDate' in statement ? { dueDate: statement.dueDate, total: statement.total } : null;

  return {
    accountKey: statement.accountKey,
    bill,
    items: statement.transactions.map((transaction) => {
      const match = matches.get(transaction.externalId);
      const duplicateOf = match?.kind === 'existing' ? match.transactionId : null;
      const transferOf = transferMatches.get(transaction.externalId) ?? null;
      const status: ImportItemStatus =
        importedIds.has(transaction.externalId) || match?.kind === 'imported'
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
        duplicateOf: status === 'possible_duplicate' ? duplicateOf : null,
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
  const linkItems = items.filter((item) => !item.transferOf && item.duplicateOf);
  const transactionItems = items.filter((item) => !item.transferOf && !item.duplicateOf);
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

  // Já lançada no app: a linha confirma o lançamento (id do arquivo + valor real), sem duplicar.
  let linked = 0;
  for (const item of linkItems) {
    const existing = await transactionRepository.findByIdAndUserId(item.duplicateOf!, userId);
    if (!existing || existing.accountId !== account.id || existing.type !== item.type) {
      throw new BadRequestError('O lançamento indicado não pertence a esta conta');
    }
    if (
      await transactionRepository.linkImported(existing.id, userId, {
        externalId: item.externalId,
        amount: item.amount,
      })
    ) {
      linked++;
    }
  }

  return {
    created: created.length,
    skipped: transactionItems.length - created.length,
    billsPaid,
    transfers: transferItems.length,
    linked,
  };
};
