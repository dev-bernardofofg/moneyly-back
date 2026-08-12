import { HttpError } from '@core/errors/http-error';
import { logger } from '@core/lib/logger';
import { processUserSpendingAlert } from '@modules/notification';
import { transactionRepository } from '../repositories/transaction.repository';

export const deleteTransactionUseCase = async (id: string, userId: string) => {
  const deleted = await transactionRepository.delete(id, userId);
  if (!deleted) throw new HttpError(404, 'Transação não encontrada');

  if (deleted.type === 'expense' && deleted.periodId) {
    try {
      // Reavalia o período: remove spending_alert que não cabe mais.
      await processUserSpendingAlert(userId, deleted.periodId);
    } catch (error) {
      logger.error('[transactions] spending alert reconcile failed', error as Error);
    }
  }

  return deleted;
};
