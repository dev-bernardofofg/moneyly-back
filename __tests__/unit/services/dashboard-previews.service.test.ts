/**
 * Unit tests for getDashboardPreviews (F5).
 * findAllByUserId injected as fake; F3/F4 heuristics run for real.
 */
import {
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

const expense = (amount: string, date: Date, title = 'Spotify') => ({
  id: 't' + Math.random(),
  type: 'expense',
  title,
  amount,
  description: null,
  date,
  periodId: null,
  recurringTransactionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: 'c1', name: 'Streaming' },
});

describe('getDashboardPreviews', () => {
  it('no transactions → nulls and stable signal', async () => {
    const deps = buildDeps();
    deps.transactionRepository.findAllByUserId.mockResolvedValue([]);

    const service = makeOverviewService(deps);
    const r = await service.getDashboardPreviews(USER, 1, 31);

    expect(r.subscriptions).toEqual({
      count: 0,
      topMonthlyCost: null,
      topTitle: null,
    });
    expect(r.comparison.signal).toBe('stable');
    expect(r.comparison.deltaPct).toBeNull();
    expect(r.comparison.topHighlight).toBeNull();
  });

  it('detects recurring subscription (top summary)', async () => {
    const deps = buildDeps();
    deps.transactionRepository.findAllByUserId.mockResolvedValue([
      expense('19.90', new Date('2026-01-10')),
      expense('19.90', new Date('2026-02-10')),
      expense('19.90', new Date('2026-03-10')),
    ]);

    const service = makeOverviewService(deps);
    const r = await service.getDashboardPreviews(USER, 1, 31);

    expect(r.subscriptions.count).toBeGreaterThanOrEqual(1);
    expect(r.subscriptions.topTitle).toBe('Spotify');
    expect(typeof r.subscriptions.topMonthlyCost).toBe('number');
    expect(['up', 'down', 'stable']).toContain(r.comparison.signal);
  });
});
