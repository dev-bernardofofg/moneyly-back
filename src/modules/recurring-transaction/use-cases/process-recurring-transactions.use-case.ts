import { logger } from '@core/lib/logger';
import { advanceSchedule } from '../helpers/schedule';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';

export const processRecurringTransactions = async (): Promise<void> => {
  const now = new Date();
  const due = await recurringTransactionRepository.findDueTransactions(now);

  for (const recurring of due) {
    try {
      const { nextExecution, advanced } = advanceSchedule(recurring, now);
      // Outro processo já avançou esta recorrência: não conta a parcela de novo.
      await recurringTransactionRepository.claimExecution(recurring, nextExecution, advanced);
    } catch (error) {
      logger.error(`[recurring] failed to process ${recurring.id}`, error as Error);
    }
  }
};
