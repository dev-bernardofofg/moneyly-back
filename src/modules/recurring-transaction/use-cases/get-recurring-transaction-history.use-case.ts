import { transactionRepository } from '../../../repositories/transaction.repository';

export const getRecurringTransactionHistoryUseCase = async (id: string, userId: string) => {
  return transactionRepository.findByRecurringTransactionId(id, userId);
};
