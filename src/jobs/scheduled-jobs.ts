import { logger } from '@core/lib/logger';
import {
  processBillReminders,
  processCardBillReminders,
  processCheckInReminders,
  processSpendingAlerts,
} from '@modules/notification';
import { processRecurringTransactions } from '@modules/recurring-transaction';

const JOBS = [
  { name: 'recurring transactions', run: processRecurringTransactions },
  { name: 'bill reminders', run: processBillReminders },
  { name: 'card bill reminders', run: processCardBillReminders },
  { name: 'check-in reminders', run: processCheckInReminders },
  { name: 'spending alerts', run: processSpendingAlerts },
] as const;

// Sequencial: recorrências avançam o calendário antes dos lembretes que leem nextExecution.
export const runScheduledJobs = async (): Promise<{ failed: string[] }> => {
  const failed: string[] = [];

  for (const job of JOBS) {
    try {
      await job.run();
    } catch (error) {
      failed.push(job.name);
      logger.error(`[scheduler] ${job.name} error`, error as Error);
    }
  }

  return { failed };
};
