import { parseTransactionDate } from '@core/helpers/dates';
import { logger } from '@core/lib/logger';
import { financialPeriodService } from '@modules/financial-period';
import { processUserSpendingAlert } from '@modules/notification';
import { transactionRepository } from '../repositories/transaction.repository';
import type { ITransaction } from '../transaction.types';
import { validateCategoryExistsForUser } from '../validations/transaction.validation';

export const createTransactionUseCase = async (userId: string, transaction: ITransaction) => {
  await validateCategoryExistsForUser(transaction.category, userId);

  // Contrato: dia-semântica → instante canônico (meia-noite SP).
  const transactionDate = parseTransactionDate(transaction.date);

  const periodId = await financialPeriodService.findOrCreatePeriodForDate(userId, transactionDate);

  const newTransaction = await transactionRepository.create({
    userId,
    type: transaction.type,
    title: transaction.title,
    amount: transaction.amount,
    categoryId: transaction.category,
    description: transaction.description || null,
    date: transactionDate,
    periodId,
    recurringTransactionId: transaction.recurringTransactionId ?? null,
  });

  if (transaction.type === 'expense') {
    try {
      await processUserSpendingAlert(userId, periodId);
    } catch (error) {
      // Falha de notificação nunca quebra a criação da transação.
      logger.error('[transactions] spending alert failed', error as Error);
    }
  }

  return newTransaction;
};
