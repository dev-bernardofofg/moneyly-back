import { getForecastUseCase } from '@modules/overview/use-cases/get-forecast.use-case';
import { financialPeriodService } from '@modules/financial-period';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { recurringTransactionRepository } from '@modules/recurring-transaction/repositories/recurring-transaction.repository';
import { requireUser } from '@modules/user/validations/user.validation';
import { HttpError } from '@core/errors/http-error';
import { getBudgetProgressUseCase } from '@modules/budget/use-cases/get-budget-progress.use-case';
import { listGoalsUseCase } from '@modules/goal/use-cases/list-goals.use-case';
import { overtimeRepository } from '@modules/overtime/repositories/overtime.repository';
import { accountRepository } from '@modules/account/repositories/account.repository';

jest.mock('@modules/financial-period');
jest.mock('@modules/transaction/repositories/transaction.repository');
jest.mock('@modules/recurring-transaction/repositories/recurring-transaction.repository');
jest.mock('@modules/user/validations/user.validation');
jest.mock('@modules/budget/use-cases/get-budget-progress.use-case');
jest.mock('@modules/goal/use-cases/list-goals.use-case');
jest.mock('@modules/overtime/repositories/overtime.repository');
jest.mock('@modules/account/repositories/account.repository', () => ({
  accountRepository: { findAllByUserId: jest.fn().mockResolvedValue([]) },
}));

const mockedPeriodSvc = financialPeriodService as jest.Mocked<typeof financialPeriodService>;
const mockedTxRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockedRecRepo = recurringTransactionRepository as jest.Mocked<
  typeof recurringTransactionRepository
>;
const mockedBudgetProgress = getBudgetProgressUseCase as jest.MockedFunction<
  typeof getBudgetProgressUseCase
>;
const mockedListGoals = listGoalsUseCase as jest.MockedFunction<typeof listGoalsUseCase>;
const mockedOvertimeRepo = overtimeRepository as jest.Mocked<typeof overtimeRepository>;

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

beforeEach(() => {
  jest.clearAllMocks();
  (requireUser as jest.Mock).mockResolvedValue({ id: USER });
  mockedBudgetProgress.mockResolvedValue([]);
  mockedListGoals.mockResolvedValue([]);
  mockedOvertimeRepo.findByUserIdInDateRange.mockResolvedValue([]);
});

describe('getForecastUseCase', () => {
  it('realized only, no recurrences → zeroed projection', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([
      { type: 'income', amount: 1000 },
      { type: 'expense', amount: 300 },
    ] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([]);

    const r = await getForecastUseCase(USER);

    expect(r.realized).toEqual({ income: 1000, expense: 300, balance: 700 });
    expect(r.projected.recurringIncome).toBe(0);
    expect(r.projected.recurringExpense).toBe(0);
    expect(r.projected.occurrences).toHaveLength(0);
    expect(r.projectedEndBalance).toBe(700);
    expect(r.freeBalance.total).toBe(700);
    expect(r.freeBalance.income).toEqual({
      fixed: 1000,
      variable: 0,
      pendingVariable: 0,
    });
  });

  it('counts a future recurrence within the period window', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([{ type: 'income', amount: 1000 }] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      {
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Aluguel',
        type: 'expense',
        amount: 200,
        frequency: 'monthly',
        dayOfMonth: null,
        dayOfWeek: null,
        nextExecution: new Date(now.getTime() + 1 * day),
        totalInstallments: null,
        executedInstallments: 0,
      },
    ] as never);

    const r = await getForecastUseCase(USER);

    expect(r.projected.occurrences).toHaveLength(1);
    expect(r.projected.recurringExpense).toBe(200);
    expect(r.projectedEndBalance).toBe(1000 - 200);
    expect(r.freeBalance.commitments.recurringExpenses).toBe(200);
  });

  it('counts an overdue execution not yet materialized once', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      {
        id: '55555555-5555-5555-5555-555555555555',
        title: 'Internet',
        type: 'expense',
        amount: 100,
        frequency: 'monthly',
        dayOfMonth: null,
        dayOfWeek: null,
        nextExecution: new Date(now.getTime() - 2 * day),
        totalInstallments: null,
        executedInstallments: 0,
      },
    ] as never);

    const r = await getForecastUseCase(USER);

    expect(r.projected.occurrences).toHaveLength(1);
    expect(r.projected.recurringExpense).toBe(100);
  });

  it('ignores an overdue execution from a previous period', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      {
        id: '66666666-6666-6666-6666-666666666666',
        title: 'Academia',
        type: 'expense',
        amount: 80,
        frequency: 'monthly',
        dayOfMonth: null,
        dayOfWeek: null,
        nextExecution: new Date(now.getTime() - 15 * day),
        totalInstallments: null,
        executedInstallments: 0,
      },
    ] as never);

    const r = await getForecastUseCase(USER);

    expect(r.projected.occurrences).toHaveLength(0);
  });

  it('ignores a recurrence with exhausted installments', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      {
        id: '44444444-4444-4444-4444-444444444444',
        title: 'Parcelado',
        type: 'expense',
        amount: 50,
        frequency: 'monthly',
        dayOfMonth: null,
        dayOfWeek: null,
        nextExecution: new Date(now.getTime() + 1 * day),
        totalInstallments: 3,
        executedInstallments: 3,
      },
    ] as never);

    const r = await getForecastUseCase(USER);
    expect(r.projected.occurrences).toHaveLength(0);
    expect(r.projectedEndBalance).toBe(0);
  });

  it('subtracts reserves and includes overtime not yet materialized', async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([
      { type: 'income', amount: 1000, overtimeRecordId: null },
    ] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([]);
    mockedBudgetProgress.mockResolvedValue([
      { remaining: 200, category: { id: '55555555-5555-5555-5555-555555555555' } },
    ] as never);
    mockedListGoals.mockResolvedValue([
      {
        targetDate: new Date(now.getTime() + 10 * day),
        progress: { remaining: 100 },
      },
    ] as never);
    mockedOvertimeRepo.findByUserIdInDateRange.mockResolvedValue([
      {
        id: '66666666-6666-6666-6666-666666666666',
        amount: 300,
        transactionId: null,
      },
    ] as never);

    const r = await getForecastUseCase(USER);

    expect(r.freeBalance.components.pendingVariableIncome).toBe(300);
    expect(r.freeBalance.reserves).toEqual({ budgets: 200, goals: 100 });
    expect(r.freeBalance.total).toBe(1000);
  });

  it('does not double count a recurrence already materialized on the same date', async () => {
    const now = new Date();
    const executionDate = new Date(now.getTime() + day);
    const recurringId = '77777777-7777-7777-7777-777777777777';
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now) as never);
    mockedTxRepo.findByPeriodId.mockResolvedValue([
      {
        type: 'expense',
        amount: 200,
        recurringTransactionId: recurringId,
        date: executionDate,
      },
    ] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      {
        id: recurringId,
        title: 'Aluguel',
        type: 'expense',
        amount: 200,
        categoryId: '88888888-8888-8888-8888-888888888888',
        frequency: 'monthly',
        dayOfMonth: null,
        dayOfWeek: null,
        nextExecution: executionDate,
        totalInstallments: null,
        executedInstallments: 0,
      },
    ] as never);

    const r = await getForecastUseCase(USER);

    expect(r.projected.occurrences).toHaveLength(0);
    expect(r.projectedEndBalance).toBe(-200);
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
    const recurrence = (id: string, date: string) => ({
      id,
      title: id,
      type: 'expense',
      amount: 1000,
      accountId: card.id,
      frequency: 'yearly',
      dayOfMonth: null,
      dayOfWeek: null,
      nextExecution: new Date(date),
      totalInstallments: null,
      executedInstallments: 0,
    });
    mockedRecRepo.findByUserId.mockResolvedValue([
      recurrence('before-closing', '2026-10-12T03:00:00.000Z'), // fatura vence 18/10
      recurrence('after-closing', '2026-10-16T03:00:00.000Z'), // fatura vence 18/11
    ] as never);

    const r = await getForecastUseCase(USER);
    jest.useRealTimers();

    expect(r.projected.occurrences.map((o) => o.recurringTransactionId)).toEqual([
      'before-closing',
    ]);
  });

  it('invalid periodId → HttpError 404', async () => {
    mockedPeriodSvc.getPeriodById.mockResolvedValue(null as never);
    await expect(getForecastUseCase(USER, '99999999-9999-9999-9999-999999999999')).rejects.toThrow(
      HttpError
    );
  });
});
