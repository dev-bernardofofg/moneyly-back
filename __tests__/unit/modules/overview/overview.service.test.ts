/**
 * Testes unitários para overview.service (reescrito contra a API atual).
 * Funções puras testadas direto; serviços que tocam DB com mocks.
 */
import {
  getDashboardOverviewUseCase,
  getStatsOverview,
} from '@modules/overview/use-cases/get-dashboard-overview.use-case';
import { getPeriodTransactionsUseCase } from '@modules/overview/use-cases/get-period-transactions.use-case';
import { financialPeriodRepository } from '@modules/financial-period/repositories/financial-period.repository';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';

jest.mock('@modules/financial-period/repositories/financial-period.repository');
jest.mock('@modules/transaction/repositories/transaction.repository');

const fpRepo = financialPeriodRepository as jest.Mocked<typeof financialPeriodRepository>;
const txRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;

const USER = 'user-123';

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

beforeEach(() => jest.clearAllMocks());

describe('getStatsOverview (pure via handlers)', () => {
  it('sums income/expense and computes balance/percentUsed', async () => {
    const r = await getStatsOverview([tx('income', '1000'), tx('expense', '400')] as never);
    expect(r.totalIncome).toBe(1000);
    expect(r.totalExpense).toBe(400);
    // Só o que entrou de fato: sem renda fixa do perfil.
    expect(r.balance).toBe(1000 - 400);
    expect(r.percentUsed).toBe(40); // 400/1000*100
  });
});

describe('getDashboardOverviewService', () => {
  it('returns stats + chart + recentTransactions', async () => {
    const r = await getDashboardOverviewUseCase([
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

describe('getTransactionsByUserId', () => {
  it('existing periodId → fetch by period', async () => {
    fpRepo.findAllByUserWithTransactionCount.mockResolvedValue([
      {
        id: 'sel',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        transactionCount: 2,
        isActive: true,
      },
    ] as never);
    const txs = [tx('expense', '100')];
    txRepo.findByPeriodId.mockResolvedValue(txs as never);

    const r = await getPeriodTransactionsUseCase(USER, undefined, 'sel');

    expect(txRepo.findByPeriodId).toHaveBeenCalledWith(USER, 'sel');
    expect(r.transactions).toEqual(txs);
    expect(r.selectedPeriod?.id).toBe('sel');
  });

  it('nonexistent periodId → empty transactions', async () => {
    fpRepo.findAllByUserWithTransactionCount.mockResolvedValue([] as never);

    const r = await getPeriodTransactionsUseCase(USER, undefined, 'nope');

    expect(r.transactions).toEqual([]);
    expect(r.selectedPeriod).toBeUndefined();
  });
});
