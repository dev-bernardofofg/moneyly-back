import { getPeriodProjectionUseCase } from '@modules/overview/use-cases/get-period-projection.use-case';
import { financialPeriodService } from '@modules/financial-period';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { recurringTransactionRepository } from '@modules/recurring-transaction/repositories/recurring-transaction.repository';
import { requireUser } from '@modules/user/validations/user.validation';
import { HttpError } from '@core/errors/http-error';
import { spMidnight } from '@core/helpers/dates';
import { accountRepository } from '@modules/account/repositories/account.repository';

jest.mock('@modules/financial-period');
jest.mock('@modules/transaction/repositories/transaction.repository');
jest.mock('@modules/recurring-transaction/repositories/recurring-transaction.repository');
jest.mock('@modules/user/validations/user.validation');
jest.mock('@modules/transfer/repositories/transfer.repository', () => ({
  transferRepository: {
    findInRange: jest.fn().mockResolvedValue([]),
    findSince: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('@modules/account/repositories/account.repository', () => ({
  accountRepository: { findAllByUserId: jest.fn().mockResolvedValue([]) },
}));

const mockedPeriodSvc = financialPeriodService as jest.Mocked<typeof financialPeriodService>;
const mockedTxRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockedRecRepo = recurringTransactionRepository as jest.Mocked<
  typeof recurringTransactionRepository
>;

const USER = '11111111-1111-1111-1111-111111111111';
const day = 86400000;

function periodAround(now: Date) {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    userId: USER,
    startDate: new Date(now.getTime() - 10 * day),
    endDate: new Date(now.getTime() + 10 * day),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

const recurrence = (overrides: Record<string, unknown>) => ({
  id: '33333333-3333-3333-3333-333333333333',
  title: 'Aluguel',
  type: 'expense',
  amount: 200,
  categoryId: '88888888-8888-8888-8888-888888888888',
  accountId: null,
  frequency: 'monthly',
  dayOfMonth: null,
  dayOfWeek: null,
  startDate: null,
  totalInstallments: null,
  executedInstallments: 0,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (requireUser as jest.Mock).mockResolvedValue({ id: USER });
});

describe('getPeriodProjectionUseCase', () => {
  it('returns only period, realized and projected', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([
      { type: 'income', amount: 1000 },
      { type: 'expense', amount: 300 },
    ] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([]);

    const r = await getPeriodProjectionUseCase(USER);

    expect(Object.keys(r)).toEqual(['period', 'realized', 'projected']);
    expect(r.realized).toEqual({ income: 1000, expense: 300, balance: 700 });
    expect(r.projected).toEqual({ recurringIncome: 0, recurringExpense: 0, occurrences: [] });
  });

  it('counts a future recurrence within the period window', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      recurrence({ nextExecution: spMidnight(new Date(now.getTime() + 1 * day)) }),
    ] as never);

    const r = await getPeriodProjectionUseCase(USER);

    expect(r.projected.occurrences).toHaveLength(1);
    expect(r.projected.recurringExpense).toBe(200);
  });

  it('counts an occurrence on the last day of the period', async () => {
    const now = new Date();
    const period = periodAround(now);
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(period as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      recurrence({ frequency: 'yearly', nextExecution: period.endDate }),
    ] as never);

    const r = await getPeriodProjectionUseCase(USER);

    expect(r.projected.occurrences).toHaveLength(1);
  });

  it('does not project an execution already overdue', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      recurrence({ nextExecution: spMidnight(new Date(now.getTime() - 2 * day)) }),
    ] as never);

    const r = await getPeriodProjectionUseCase(USER);

    expect(r.projected.occurrences).toHaveLength(0);
  });

  it('ignores a recurrence with exhausted installments', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      recurrence({
        nextExecution: spMidnight(new Date(now.getTime() + 1 * day)),
        totalInstallments: 3,
        executedInstallments: 3,
      }),
    ] as never);

    const r = await getPeriodProjectionUseCase(USER);

    expect(r.projected.occurrences).toHaveLength(0);
  });

  it('does not double count a recurrence already materialized on the same date', async () => {
    const now = new Date();
    const executionDate = spMidnight(new Date(now.getTime() + day));
    const rec = recurrence({ nextExecution: executionDate });
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([
      { type: 'expense', amount: 200, recurringTransactionId: rec.id, date: executionDate },
    ] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([rec] as never);

    const r = await getPeriodProjectionUseCase(USER);

    expect(r.projected.occurrences).toHaveLength(0);
    expect(r.realized.expense).toBe(200);
  });

  it('projects a card recurrence into the period of its invoice due date', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-10-10T15:00:00.000Z'));
    const now = new Date();
    const card = {
      id: '99999999-9999-9999-9999-999999999999',
      type: 'credit_card',
      isDefault: false,
      closingDay: 15,
      dueDay: 18,
      openingBalance: 0,
      openingBalanceDate: null,
    };
    (accountRepository.findAllByUserId as jest.Mock).mockResolvedValueOnce([card]);
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      // Fatura vence 18/10.
      recurrence({
        id: 'before-closing',
        accountId: card.id,
        frequency: 'yearly',
        nextExecution: new Date('2026-10-12T03:00:00.000Z'),
      }),
      // Fatura vence 18/11.
      recurrence({
        id: 'after-closing',
        accountId: card.id,
        frequency: 'yearly',
        nextExecution: new Date('2026-10-16T03:00:00.000Z'),
      }),
    ] as never);

    const r = await getPeriodProjectionUseCase(USER);
    jest.useRealTimers();

    expect(r.projected.occurrences.map((o) => o.recurringTransactionId)).toEqual([
      'before-closing',
    ]);
  });

  it('invents no occurrence for a recurrence that starts after the period', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-11-05T15:00:00.000Z'));
    const now = new Date();
    const start = spMidnight('2027-01-20');
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue({
      ...periodAround(now),
      startDate: spMidnight('2026-11-01'),
      endDate: spMidnight('2026-11-30'),
    } as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      recurrence({
        type: 'income',
        amount: 500000,
        dayOfMonth: 20,
        startDate: start,
        nextExecution: start,
      }),
      recurrence({
        id: '44444444-4444-4444-4444-444444444444',
        dayOfMonth: 20,
        startDate: start,
        nextExecution: start,
      }),
    ] as never);

    const r = await getPeriodProjectionUseCase(USER);
    jest.useRealTimers();

    expect(r.projected).toEqual({ recurringIncome: 0, recurringExpense: 0, occurrences: [] });
  });

  it('invalid periodId → HttpError 404', async () => {
    mockedPeriodSvc.getPeriodById.mockResolvedValue(null as never);
    await expect(
      getPeriodProjectionUseCase(USER, '99999999-9999-9999-9999-999999999999')
    ).rejects.toThrow(HttpError);
  });
});
