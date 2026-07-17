import type { RecurringTransaction } from '../../../infra/db/schema';
import { calculateFirstExecution } from '../helpers/execution-dates';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';
import type { RecurringFrequency } from '../recurring-transaction.types';

export const reactivateRecurringTransactionUseCase = async (
  id: string,
  userId: string
): Promise<RecurringTransaction | null> => {
  const existing = await recurringTransactionRepository.findById(id, userId);
  if (!existing) return null;

  const nextExecution = calculateFirstExecution(
    existing.frequency as RecurringFrequency,
    existing.dayOfMonth,
    existing.dayOfWeek
  );

  return recurringTransactionRepository.reactivate(id, userId, nextExecution);
};
