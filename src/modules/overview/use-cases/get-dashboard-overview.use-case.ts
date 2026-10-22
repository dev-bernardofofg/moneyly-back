import type { TransactionWithCategory } from '@modules/transaction';
import {
  calculatePeriodChartData,
  calculateStats,
  getRecentTransactions,
} from '../helpers/overview-handlers';

export const getStatsOverview = async (transactions: TransactionWithCategory[]) => {
  return calculateStats(transactions);
};

export const getDashboardOverviewUseCase = async (
  periodTransactions: TransactionWithCategory[]
) => {
  const stats = await getStatsOverview(periodTransactions);
  const chart = calculatePeriodChartData(periodTransactions);
  const recentTransactions = getRecentTransactions(periodTransactions);

  return { stats, chart, recentTransactions };
};
