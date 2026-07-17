import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';

export const deleteRecurringTransactionUseCase = async (
  id: string,
  userId: string
): Promise<boolean> => {
  return recurringTransactionRepository.delete(id, userId);
};
