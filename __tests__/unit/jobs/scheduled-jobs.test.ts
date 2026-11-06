import { runScheduledJobs } from '../../../src/jobs/scheduled-jobs';
import {
  processBillReminders,
  processCardBillReminders,
  processCheckInReminders,
  processSpendingAlerts,
} from '@modules/notification';
import { processRecurringTransactions } from '@modules/recurring-transaction';

jest.mock('@modules/notification', () => ({
  processBillReminders: jest.fn(),
  processCardBillReminders: jest.fn(),
  processCheckInReminders: jest.fn(),
  processSpendingAlerts: jest.fn(),
}));
jest.mock('@modules/recurring-transaction', () => ({
  processRecurringTransactions: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('runScheduledJobs', () => {
  it('runs recurrences and reminders', async () => {
    await expect(runScheduledJobs()).resolves.toEqual({ failed: [] });

    expect(processRecurringTransactions).toHaveBeenCalledTimes(1);
    expect(processBillReminders).toHaveBeenCalledTimes(1);
    expect(processCardBillReminders).toHaveBeenCalledTimes(1);
    expect(processCheckInReminders).toHaveBeenCalledTimes(1);
  });

  it('does not run spending alerts', async () => {
    await runScheduledJobs();

    expect(processSpendingAlerts).not.toHaveBeenCalled();
  });
});
