import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';

export const deactivateRecurringTransactionUseCase = async (
  id: string,
  userId: string
): Promise<boolean> => {
  return recurringTransactionRepository.deactivate(id, userId);
};
