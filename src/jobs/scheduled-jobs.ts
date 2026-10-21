import { logger } from '@core/lib/logger';
import {
  processBillReminders,
  processCardBillReminders,
  processBudgetAlerts,
  processSpendingAlerts,
} from '@modules/notification';
import { processRecurringTransactions } from '@modules/recurring-transaction';

const JOBS = [
  { name: 'recurring transactions', run: processRecurringTransactions },
  { name: 'budget alerts', run: processBudgetAlerts },
  { name: 'bill reminders', run: processBillReminders },
  { name: 'card bill reminders', run: processCardBillReminders },
  { name: 'spending alerts', run: processSpendingAlerts },
] as const;

// Sequencial: recorrências materializam antes dos alertas que dependem delas.
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
