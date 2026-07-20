import { HttpError } from '@core/errors/http-error';
import { transactionRepository } from '../repositories/transaction.repository';

export const deleteTransactionUseCase = async (id: string, userId: string) => {
  const deleted = await transactionRepository.delete(id, userId);
  if (!deleted) throw new HttpError(404, 'Transação não encontrada');
  return deleted;
};
