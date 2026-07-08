/**
 * Unit tests for the forecast service (factory with injected dependencies).
 */
import {
  makeForecastService,
  type ForecastServiceDeps,
} from '../../../src/services/forecast.service';
import { HttpError } from '../../../src/validations/errors';

const USER = '11111111-1111-1111-1111-111111111111';
const day = 86400000;

const buildDeps = () => {
  const deps = {
    transactionRepository: {
      findByPeriodId: jest.fn(),
    },
    recurringTransactionRepository: {
      findByUserId: jest.fn(),
    },
    financialPeriodService: {
      getPeriodById: jest.fn(),
      ensureCurrentPeriodExists: jest.fn(),
    },
    requireUser: jest.fn().mockResolvedValue({ id: USER }),
  };
  return deps as unknown as ForecastServiceDeps & typeof deps;
};

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

describe('getForecast', () => {
  it('realized only, no recurrences → zeroed projection', async () => {
    const deps = buildDeps();
    const now = new Date();
    deps.financialPeriodService.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now));
    deps.transactionRepository.findByPeriodId.mockResolvedValue([
      { type: 'income', amount: '1000' },
      { type: 'expense', amount: '300' },
    ]);
    deps.recurringTransactionRepository.findByUserId.mockResolvedValue([]);

    const service = makeForecastService(deps);
    const r = await service.getForecast(USER);

    expect(r.realized).toEqual({ income: 1000, expense: 300, balance: 700 });
    expect(r.projected.recurringIncome).toBe(0);
    expect(r.projected.recurringExpense).toBe(0);
    expect(r.projected.occurrences).toHaveLength(0);
    expect(r.projectedEndBalance).toBe(700);
  });

  it('counts a future recurrence within the period window', async () => {
    const deps = buildDeps();
    const now = new Date();
    deps.financialPeriodService.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now));
    deps.transactionRepository.findByPeriodId.mockResolvedValue([
      { type: 'income', amount: '1000' },
    ]);
    deps.recurringTransactionRepository.findByUserId.mockResolvedValue([
      {
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Aluguel',
        type: 'expense',
        amount: '200',
        frequency: 'monthly',
        dayOfMonth: null,
        dayOfWeek: null,
        nextExecution: new Date(now.getTime() + 1 * day),
        totalInstallments: null,
        executedInstallments: 0,
      },
    ]);

    const service = makeForecastService(deps);
    const r = await service.getForecast(USER);

    expect(r.projected.occurrences).toHaveLength(1);
    expect(r.projected.recurringExpense).toBe(200);
    expect(r.projectedEndBalance).toBe(1000 - 200);
  });

  it('ignores a recurrence with exhausted installments', async () => {
    const deps = buildDeps();
    const now = new Date();
    deps.financialPeriodService.ensureCurrentPeriodExists.mockResolvedValue(periodAround(now));
    deps.transactionRepository.findByPeriodId.mockResolvedValue([]);
    deps.recurringTransactionRepository.findByUserId.mockResolvedValue([
      {
        id: '44444444-4444-4444-4444-444444444444',
        title: 'Parcelado',
        type: 'expense',
        amount: '50',
        frequency: 'monthly',
        dayOfMonth: null,
        dayOfWeek: null,
        nextExecution: new Date(now.getTime() + 1 * day),
        totalInstallments: 3,
        executedInstallments: 3,
      },
    ]);

    const service = makeForecastService(deps);
    const r = await service.getForecast(USER);

    expect(r.projected.occurrences).toHaveLength(0);
    expect(r.projectedEndBalance).toBe(0);
  });

  it('invalid periodId → HttpError 404', async () => {
    const deps = buildDeps();
    deps.financialPeriodService.getPeriodById.mockResolvedValue(null);

    const service = makeForecastService(deps);

    await expect(service.getForecast(USER, '99999999-9999-9999-9999-999999999999')).rejects.toThrow(
      HttpError
    );
  });
});
