import { sumAmounts } from '../../../core/helpers/amount';
import { getCurrentSaoPauloDate } from '../../../core/helpers/dates';
import { NotFoundError } from '../../../core/errors';
import { getCurrentFinancialPeriod } from '../../financial-period';
import { transactionRepository } from '../../transaction';
import { userRepository } from '../../user';
import { calculateMonthlyAggregates } from '../helpers/overview-handlers';

export const getFinancialInsightsUseCase = async (userId: string, monthlyIncome: number) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new NotFoundError('Usuário não encontrado');

  const allTransactions = await transactionRepository.findAllByUserId(userId);
  const monthlyData = calculateMonthlyAggregates(allTransactions);

  const currentPeriod = getCurrentFinancialPeriod(
    user.financialDayStart ?? 1,
    user.financialDayEnd ?? 31
  );

  const now = getCurrentSaoPauloDate();
  const totalDays = Math.max(
    1,
    Math.ceil((currentPeriod.endDate.getTime() - currentPeriod.startDate.getTime()) / 86400000)
  );
  const daysElapsed = Math.max(
    1,
    Math.ceil((now.getTime() - currentPeriod.startDate.getTime()) / 86400000)
  );

  const currentPeriodTx = allTransactions.filter((tx) => {
    const d = new Date(tx.date);
    return d >= currentPeriod.startDate && d <= currentPeriod.endDate;
  });

  const currentExpense = sumAmounts(currentPeriodTx.filter((tx) => tx.type === 'expense'));

  const projectedExpense = Number(((currentExpense / daysElapsed) * totalDays).toFixed(2));

  const lastTwo = monthlyData.slice(-2);
  const prevMonth = lastTwo[0] ?? null;
  const currMonth = lastTwo[1] ?? null;

  const expenseChange =
    prevMonth && currMonth && prevMonth.expense > 0
      ? Number((((currMonth.expense - prevMonth.expense) / prevMonth.expense) * 100).toFixed(1))
      : null;

  const incomeChange =
    prevMonth && currMonth && prevMonth.income > 0
      ? Number((((currMonth.income - prevMonth.income) / prevMonth.income) * 100).toFixed(1))
      : null;

  const totalExpenseAllTime = monthlyData.reduce((s, m) => s + m.expense, 0);
  const avgMonthlyExpense =
    monthlyData.length > 0 ? Number((totalExpenseAllTime / monthlyData.length).toFixed(2)) : 0;

  const avgMonthlyIncome =
    monthlyData.length > 0
      ? Number((monthlyData.reduce((s, m) => s + m.income, 0) / monthlyData.length).toFixed(2))
      : 0;

  const bestMonth = monthlyData.length
    ? monthlyData.reduce((min, m) => (m.expense < min.expense ? m : min))
    : null;

  const worstMonth = monthlyData.length
    ? monthlyData.reduce((max, m) => (m.expense > max.expense ? m : max))
    : null;

  const categoryMap: Record<string, { name: string; amount: number }> = {};
  allTransactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      if (!categoryMap[tx.category.id]) {
        categoryMap[tx.category.id] = { name: tx.category.name, amount: 0 };
      }
      categoryMap[tx.category.id]!.amount += Number(tx.amount);
    });

  const topCategories = Object.values(categoryMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      amount: Number(c.amount.toFixed(2)),
      percentage:
        totalExpenseAllTime > 0 ? Number(((c.amount / totalExpenseAllTime) * 100).toFixed(1)) : 0,
    }));

  return {
    currentPeriod: {
      daysElapsed,
      totalDays,
      completionPercentage: Math.min(100, Math.round((daysElapsed / totalDays) * 100)),
      currentExpense: Number(currentExpense.toFixed(2)),
      projectedExpense,
      isOnTrack: projectedExpense <= monthlyIncome,
    },
    trend: {
      previousMonth: prevMonth,
      currentMonth: currMonth,
      expenseChange,
      incomeChange,
    },
    allTime: {
      averageMonthlyExpense: avgMonthlyExpense,
      averageMonthlyIncome: avgMonthlyIncome,
      bestMonth,
      worstMonth,
      totalMonths: monthlyData.length,
      totalTransactions: allTransactions.length,
    },
    topCategories,
    monthlyHistory: monthlyData,
  };
};
