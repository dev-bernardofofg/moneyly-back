import { convertSubscriptionToRecurringUseCase } from '../../../../src/modules/subscription/use-cases/convert-subscription-to-recurring.use-case';
import { createRecurringTransactionService } from '../../../../src/services/recurring-transaction.service';
import { recurringTransactionRepository } from '../../../../src/repositories/recurring-transaction.repository';
import { HttpError } from '../../../../src/validations/errors';

jest.mock('../../../../src/repositories/recurring-transaction.repository');
jest.mock('../../../../src/repositories/transaction.repository');
jest.mock('../../../../src/services/recurring-transaction.service');
jest.mock('../../../../src/modules/user/validations/user.validation');

const mockedRepo = recurringTransactionRepository as jest.Mocked<
  typeof recurringTransactionRepository
>;
const mockedCreate = createRecurringTransactionService as jest.Mock;

const USER = '11111111-1111-1111-1111-111111111111';
const DAY_MS = 24 * 60 * 60 * 1000;

const baseInput = {
  title: 'Netflix',
  amount: '55.90',
  categoryId: '33333333-3333-3333-3333-333333333333',
  cadence: 'monthly' as const,
  nextEstimatedDate: new Date(Date.now() + 10 * DAY_MS),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedRepo.findByUserId.mockResolvedValue([]);
  mockedCreate.mockResolvedValue({ id: 'rec-1' });
});

describe('convertSubscriptionToRecurringService', () => {
  it('creates expense recurring delegating to createRecurringTransactionService', async () => {
    const result = await convertSubscriptionToRecurringUseCase(USER, baseInput);

    expect(result).toEqual({ id: 'rec-1' });
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    const [userId, data] = mockedCreate.mock.calls[0]!;
    expect(userId).toBe(USER);
    expect(data.type).toBe('expense');
    expect(data.title).toBe('Netflix');
    expect(data.amount).toBe('55.90');
    expect(data.frequency).toBe('monthly');
  });

  it('rejects duplicate active recurring with same normalized title → 409', async () => {
    mockedRepo.findByUserId.mockResolvedValue([{ title: 'NETFLIX 03/12' }] as never);

    await expect(convertSubscriptionToRecurringUseCase(USER, baseInput)).rejects.toMatchObject({
      status: 409,
    });
    await expect(convertSubscriptionToRecurringUseCase(USER, baseInput)).rejects.toBeInstanceOf(
      HttpError
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('past nextEstimatedDate is advanced to a strictly future startDate', async () => {
    await convertSubscriptionToRecurringUseCase(USER, {
      ...baseInput,
      nextEstimatedDate: new Date(Date.now() - 40 * DAY_MS),
    });

    const [, data] = mockedCreate.mock.calls[0]!;
    expect(data.startDate.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it('monthly derives dayOfMonth from startDate', async () => {
    await convertSubscriptionToRecurringUseCase(USER, baseInput);

    const [, data] = mockedCreate.mock.calls[0]!;
    expect(data.dayOfMonth).toBe(data.startDate.getDate());
    expect(data.dayOfWeek).toBeUndefined();
  });

  it('weekly derives dayOfWeek from startDate', async () => {
    await convertSubscriptionToRecurringUseCase(USER, {
      ...baseInput,
      cadence: 'weekly',
      nextEstimatedDate: new Date(Date.now() + 5 * DAY_MS),
    });

    const [, data] = mockedCreate.mock.calls[0]!;
    expect(data.frequency).toBe('weekly');
    expect(data.dayOfWeek).toBe(data.startDate.getDay());
    expect(data.dayOfMonth).toBeUndefined();
  });

  it('yearly sets neither dayOfMonth nor dayOfWeek', async () => {
    await convertSubscriptionToRecurringUseCase(USER, {
      ...baseInput,
      cadence: 'yearly',
      nextEstimatedDate: new Date(Date.now() + 100 * DAY_MS),
    });

    const [, data] = mockedCreate.mock.calls[0]!;
    expect(data.frequency).toBe('yearly');
    expect(data.dayOfMonth).toBeUndefined();
    expect(data.dayOfWeek).toBeUndefined();
  });
});
