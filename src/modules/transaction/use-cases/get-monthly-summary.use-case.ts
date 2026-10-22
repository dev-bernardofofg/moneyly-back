import { format } from 'date-fns';
import { computeSpendingStats } from '../helpers/spending-stats';
import { transactionRepository } from '../repositories/transaction.repository';

export const getMonthlySummaryUseCase = async (
  userId: string,
  filters: { startDate?: Date; endDate?: Date }
) => {
  const txns = await transactionRepository.findByUserId(userId, filters);
  const summary: Record<
    string,
    { income: number; expense: number; percentUsed: number | null; alert: string | null }
  > = {};

  for (const tx of txns) {
    const monthKey = format(new Date(tx.date), 'yyyy-MM');
    if (!summary[monthKey]) {
      summary[monthKey] = { income: 0, expense: 0, percentUsed: null, alert: null };
    }
    if (tx.type === 'income') summary[monthKey]!.income += Number(tx.amount);
    else summary[monthKey]!.expense += Number(tx.amount);
  }

  for (const monthData of Object.values(summary)) {
    const stats = computeSpendingStats(
      monthData.expense,
      monthData.income,
      'Você já usou mais de 80% das entradas do mês!'
    );
    monthData.percentUsed = stats.percentUsed;
    monthData.alert = stats.alert;
  }

  return Object.entries(summary).map(([month, data]) => ({ month, ...data }));
};
