import type { TransactionWithCategory } from '@modules/transaction';
import {
  calculatePeriodChartData,
  calculateStats,
  getRecentTransactions,
} from '../helpers/overview-handlers';

export const getStatsOverview = async (
  transactions: TransactionWithCategory[],
  monthlyIncome: number
) => {
  return calculateStats(transactions, monthlyIncome);
};

export const getDashboardOverviewUseCase = async (
  monthlyIncome: number,
  periodTransactions: TransactionWithCategory[]
) => {
  const stats = await getStatsOverview(periodTransactions, monthlyIncome);
  const chart = calculatePeriodChartData(periodTransactions);
  const recentTransactions = getRecentTransactions(periodTransactions);

  return { stats, chart, recentTransactions };
};
