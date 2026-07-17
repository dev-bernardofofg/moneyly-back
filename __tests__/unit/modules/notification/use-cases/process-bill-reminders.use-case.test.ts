import { processBillReminders } from '../../../../../src/modules/notification/use-cases/process-bill-reminders.use-case';
import { notificationRepository } from '../../../../../src/modules/notification/repositories/notification.repository';
import { recurringTransactionRepository } from '../../../../../src/modules/recurring-transaction/repositories/recurring-transaction.repository';

jest.mock('../../../../../src/modules/notification/repositories/notification.repository');
jest.mock(
  '../../../../../src/modules/recurring-transaction/repositories/recurring-transaction.repository'
);

const mockedNotificationRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;
const mockedRecurringRepo = recurringTransactionRepository as jest.Mocked<
  typeof recurringTransactionRepository
>;

const USER = '11111111-1111-1111-1111-111111111111';
const DAY_MS = 24 * 60 * 60 * 1000;

const recurring = (daysAhead: number, overrides: Record<string, unknown> = {}) => ({
  id: 'rec-1',
  userId: USER,
  type: 'expense',
  title: 'Netflix',
  amount: '55.90',
  categoryId: 'cat-1',
  frequency: 'monthly',
  nextExecution: new Date(Date.now() + daysAhead * DAY_MS),
  isActive: true,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('processBillReminders', () => {
  it('creates bill_reminder notification for upcoming expense', async () => {
    mockedRecurringRepo.findUpcomingExpenses.mockResolvedValue([recurring(2)] as never);
    mockedNotificationRepo.findByDedupeKey.mockResolvedValue(null);
    mockedNotificationRepo.create.mockResolvedValue({} as never);

    await processBillReminders();

    expect(mockedNotificationRepo.create).toHaveBeenCalledTimes(1);
    const arg = mockedNotificationRepo.create.mock.calls[0]![0];
    expect(arg.type).toBe('bill_reminder');
    expect(arg.severity).toBe('info');
    expect(arg.userId).toBe(USER);
    expect(arg.relatedId).toBe('rec-1');
    expect(arg.dedupeKey).toMatch(/^bill:rec-1:\d{4}-\d{2}-\d{2}$/);
    expect(arg.message).toContain('Netflix');
    expect(arg.message).toContain('R$ 55,90');
  });

  it('idempotent: dedupeKey already exists → no create', async () => {
    mockedRecurringRepo.findUpcomingExpenses.mockResolvedValue([recurring(1)] as never);
    mockedNotificationRepo.findByDedupeKey.mockResolvedValue({ id: 'n1' } as never);

    await processBillReminders();

    expect(mockedNotificationRepo.create).not.toHaveBeenCalled();
  });

  it('no upcoming expenses → nothing happens', async () => {
    mockedRecurringRepo.findUpcomingExpenses.mockResolvedValue([]);

    await processBillReminders();

    expect(mockedNotificationRepo.findByDedupeKey).not.toHaveBeenCalled();
    expect(mockedNotificationRepo.create).not.toHaveBeenCalled();
  });

  it('scheduler race: create throws pg 23505 → does not propagate', async () => {
    mockedRecurringRepo.findUpcomingExpenses.mockResolvedValue([recurring(2)] as never);
    mockedNotificationRepo.findByDedupeKey.mockResolvedValue(null);
    const uniqueViolation = Object.assign(new Error('unique violation'), { code: '23505' });
    mockedNotificationRepo.create.mockRejectedValue(uniqueViolation);

    await expect(processBillReminders()).resolves.toBeUndefined();
  });

  it('unexpected error propagates', async () => {
    mockedRecurringRepo.findUpcomingExpenses.mockResolvedValue([recurring(2)] as never);
    mockedNotificationRepo.findByDedupeKey.mockResolvedValue(null);
    mockedNotificationRepo.create.mockRejectedValue(new Error('db down'));

    await expect(processBillReminders()).rejects.toThrow('db down');
  });
});
