import { toSaoPauloTimezone } from '@core/helpers/dates';
import { financialPeriodService } from '@modules/financial-period';
import { transactionRepository } from '../repositories/transaction.repository';
import type { ITransaction } from '../transaction.types';
import { validateCategoryExistsForUser } from '../validations/transaction.validation';

export const createTransactionUseCase = async (userId: string, transaction: ITransaction) => {
  await validateCategoryExistsForUser(transaction.category, userId);

  const transactionDate = transaction.date
    ? toSaoPauloTimezone(transaction.date)
    : toSaoPauloTimezone(new Date());

  const periodId = await financialPeriodService.findOrCreatePeriodForDate(userId, transactionDate);

  const newTransaction = await transactionRepository.create({
    userId,
    type: transaction.type,
    title: transaction.title,
    amount: transaction.amount,
    categoryId: transaction.category,
    description: transaction.description,
    date: transactionDate,
    periodId,
    recurringTransactionId: transaction.recurringTransactionId ?? null,
  });

  return newTransaction;
};
