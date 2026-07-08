/**
 * Unit tests for the overview service.
 * Pure functions are tested directly; dependency-backed services get injected fakes.
 */
import {
  calculateAlerts,
  calculatePlanningStats,
  getDashboardOverviewService,
  getStatsOverview,
  makeOverviewService,
  type OverviewServiceDeps,
} from '../../../src/services/overview.service';

const USER = 'user-123';

const buildDeps = () => {
  const deps = {
    financialPeriodRepository: {
      findAllByUserWithTransactionCount: jest.fn(),
    },
    transactionRepository: {
      findByPeriodId: jest.fn(),
      findByUserId: jest.fn(),
      findAllByUserId: jest.fn(),
    },
    userRepository: {
      findById: jest.fn(),
    },
    getBudgetProgress: jest.fn(),
    getGoalsProgress: jest.fn(),
  };
  return deps as unknown as OverviewServiceDeps & typeof deps;
};

const tx = (type: 'income' | 'expense', amount: string, catId = 'c1') => ({
  id: 't' + Math.random(),
  type,
  title: 'x',
  amount,
  description: null,
  date: new Date(),
  periodId: null,
  recurringTransactionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: catId, name: 'Cat' },
});

describe('getStatsOverview (pure via handlers)', () => {
  it('sums income/expense and computes balance/percentUsed', async () => {
    const r = await getStatsOverview([tx('income', '1000'), tx('expense', '400')] as never, 2000);
    expect(r.totalIncome).toBe(1000);
    expect(r.totalExpense).toBe(400);
    // balance = monthlyIncome + income - expense
    expect(r.balance).toBe(2000 + 1000 - 400);
    expect(r.percentUsed).toBe(20); // 400/2000*100
  });
});

describe('getDashboardOverviewService', () => {
  it('returns stats + chart + recentTransactions', async () => {
    const r = await getDashboardOverviewService(3000, [
      tx('expense', '100', 'c1'),
      tx('income', '500', 'c2'),
    ] as never);

    expect(r).toHaveProperty('stats');
    expect(r).toHaveProperty('chart');
    expect(r).toHaveProperty('recentTransactions');
    expect(Array.isArray(r.recentTransactions)).toBe(true);
    expect(r.chart).toHaveProperty('data');
    expect(r.chart).toHaveProperty('categories');
  });
});

describe('calculatePlanningStats (pure)', () => {
  it('aggregates budgeted/savings and percentages', () => {
    const budgetProgress = [{ monthlyLimit: '1000' }, { monthlyLimit: '500' }] as never;
    const goalsProgress = [{ targetAmount: '2000', currentAmount: '500' }] as never;

    const r = calculatePlanningStats(budgetProgress, goalsProgress, 4000);

    expect(r.totalBudgeted).toBe(1500);
    expect(r.totalSavingsGoal).toBe(2000);
    expect(r.totalSaved).toBe(500);
    expect(r.savingsProgress).toBe(25); // 500/2000*100
    expect(r.budgetPercentage).toBe(37.5); // 1500/4000*100
    expect(r.remainingToSave).toBe(1500);
    expect(r.availableForBudget).toBe(2000); // 4000-2000
  });

  it('monthlyIncome 0 → percentages 0, no division by zero', () => {
    const r = calculatePlanningStats([], [], 0);
    expect(r.budgetPercentage).toBe(0);
    expect(r.savingsPercentage).toBe(0);
  });
});

describe('calculateAlerts (pure)', () => {
  it('emits danger for exceeded budget and sorts by priority', () => {
    const budgetProgress = [
      { percentage: 120, category: { name: 'Comida' } },
      { percentage: 85, category: { name: 'Lazer' } },
    ] as never;
    const stats = {
      budgetPercentage: 50,
      savingsPercentage: 0,
    } as never;

    const alerts = calculateAlerts(stats, 1000, budgetProgress, []);

    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(alerts[0]!.priority).toBe('high'); // ordenado: high primeiro
    expect(alerts.some((a) => a.type === 'danger')).toBe(true);
  });

  it('no alerts when everything healthy', () => {
    const alerts = calculateAlerts(
      { budgetPercentage: 10, savingsPercentage: 0 } as never,
      1000,
      [],
      []
    );
    expect(alerts).toEqual([]);
  });
});

describe('getPlannerOverview', () => {
  it('combines stats + alerts from budget/goal progress deps', async () => {
    const deps = buildDeps();
    deps.getBudgetProgress.mockResolvedValue([{ monthlyLimit: '1000' }]);
    deps.getGoalsProgress.mockResolvedValue([{ targetAmount: '2000', currentAmount: '0' }]);

    const service = makeOverviewService(deps);
    const r = await service.getPlannerOverview(USER, 5000);

    expect(deps.getBudgetProgress).toHaveBeenCalledWith(USER);
    expect(deps.getGoalsProgress).toHaveBeenCalledWith(USER);
    expect(r).toHaveProperty('stats');
    expect(r).toHaveProperty('alerts');
    expect(r.stats.totalBudgeted).toBe(1000);
  });
});

describe('getTransactionsByUserId', () => {
  it('existing periodId → fetch by period', async () => {
    const deps = buildDeps();
    deps.financialPeriodRepository.findAllByUserWithTransactionCount.mockResolvedValue([
      {
        id: 'sel',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        transactionCount: 2,
        isActive: true,
      },
    ]);
    const txs = [tx('expense', '100')];
    deps.transactionRepository.findByPeriodId.mockResolvedValue(txs);

    const service = makeOverviewService(deps);
    const r = await service.getTransactionsByUserId(USER, undefined, 'sel');

    expect(deps.transactionRepository.findByPeriodId).toHaveBeenCalledWith(USER, 'sel');
    expect(r.transactions).toEqual(txs);
    expect(r.selectedPeriod?.id).toBe('sel');
  });

  it('nonexistent periodId → empty transactions', async () => {
    const deps = buildDeps();
    deps.financialPeriodRepository.findAllByUserWithTransactionCount.mockResolvedValue([]);

    const service = makeOverviewService(deps);
    const r = await service.getTransactionsByUserId(USER, undefined, 'nope');

    expect(r.transactions).toEqual([]);
    expect(r.selectedPeriod).toBeUndefined();
  });
});
