import { spDayString, spEndOfDay } from '@core/helpers/dates';
import { BadRequestError } from '@core/errors';
import { logger } from '@core/lib/logger';
import { categoryRepository } from '@modules/category/repositories/category.repository';
import { financialPeriodService } from '@modules/financial-period';
import { processUserSpendingAlert } from '@modules/notification';
import {
  buildImportCategorySuggester,
  isCardBillPayment,
} from '../helpers/import-category-suggester';
import { decodeOfxFile, parseOfx } from '../helpers/ofx-parser';
import { transactionRepository } from '../repositories/transaction.repository';
import type { ConfirmImportInput } from '../schemas/transaction-import.schema';
import { validateCategoryExistsForUser } from '../validations/transaction.validation';

const TITLE_HISTORY_LIMIT = 2000;

export type ImportItemStatus = 'new' | 'imported' | 'possible_duplicate' | 'bill_payment';

const dayKey = (type: string, amount: number, date: Date) =>
  `${type}:${amount.toFixed(2)}:${spDayString(date)}`;

export const previewTransactionImportUseCase = async (userId: string, fileBase64Url: string) => {
  let statement;
  try {
    statement = parseOfx(decodeOfxFile(Buffer.from(fileBase64Url, 'base64url')));
  } catch {
    throw new BadRequestError('Arquivo não é um extrato OFX válido');
  }
  if (statement.transactions.length === 0) {
    throw new BadRequestError('Nenhuma transação encontrada no extrato');
  }

  const times = statement.transactions.map((transaction) => transaction.date.getTime());
  const [imported, manual, history, categories] = await Promise.all([
    transactionRepository.findImportedExternalIds(
      userId,
      statement.transactions.map((transaction) => transaction.externalId)
    ),
    transactionRepository.findManualInRange(
      userId,
      new Date(Math.min(...times)),
      spEndOfDay(new Date(Math.max(...times)))
    ),
    transactionRepository.findRecentTitleCategories(userId, TITLE_HISTORY_LIMIT),
    categoryRepository.findByUserId(userId),
  ]);

  const importedIds = new Set(imported);
  const manualByDay = new Map(
    manual.map((transaction) => [
      dayKey(transaction.type, Number(transaction.amount), transaction.date),
      transaction.id,
    ])
  );
  const suggester = buildImportCategorySuggester(history, categories);

  return {
    accountKey: statement.accountKey,
    items: statement.transactions.map((transaction) => {
      const duplicateOf = manualByDay.get(
        dayKey(transaction.type, transaction.amount, transaction.date)
      );
      const status: ImportItemStatus = importedIds.has(transaction.externalId)
        ? 'imported'
        : isCardBillPayment(transaction.title, transaction.type)
          ? 'bill_payment'
          : duplicateOf
            ? 'possible_duplicate'
            : 'new';

      const suggestion = suggester.suggest(transaction.title, transaction.type);
      return {
        ...transaction,
        status,
        duplicateOf: status === 'possible_duplicate' ? duplicateOf! : null,
        suggestedCategoryId: suggestion.categoryId,
        suggestionSource: suggestion.source,
      };
    }),
  };
};

export const confirmTransactionImportUseCase = async (
  userId: string,
  { items }: ConfirmImportInput
) => {
  const categoryIds = [...new Set(items.map((item) => item.categoryId))];
  for (const categoryId of categoryIds) await validateCategoryExistsForUser(categoryId, userId);

  // Um período por dia, não por linha: extratos têm dezenas de lançamentos no mesmo dia.
  const periodByDay = new Map<string, string>();
  const rows = [];
  for (const item of items) {
    const day = spDayString(item.date);
    let periodId = periodByDay.get(day);
    if (!periodId) {
      periodId = await financialPeriodService.findOrCreatePeriodForDate(userId, item.date);
      periodByDay.set(day, periodId);
    }
    rows.push({
      userId,
      type: item.type,
      title: item.title,
      amount: item.amount.toString(),
      categoryId: item.categoryId,
      description: null,
      date: item.date,
      periodId,
      recurringTransactionId: null,
      externalId: item.externalId,
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

  return { created: created.length, skipped: items.length - created.length };
};
