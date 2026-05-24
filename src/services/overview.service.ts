import type { GoalWithMilestones } from '../repositories/interfaces/IGoalRepository';
import type { BudgetProgress } from '../types/budget.types';
import { getCurrentSaoPauloDate } from '../helpers/dates';
import {
  formatPeriodLabel,
  getCurrentFinancialPeriod,
  getPreviousFinancialPeriods,
} from '../helpers/financial-period';
import { groupSubscriptionCandidates } from '../helpers/subscription-detector';
import { buildComparison } from '../helpers/comparative-insights';
import { NotFoundError } from './errors';
import {
  calculateMonthlyAggregates,
  calculatePeriodChartData,
  calculateStats,
  getRecentTransactions,
} from '../helpers/handlers/overview-handlers';
import { financialPeriodRepository } from '../repositories/financial-period.repository';
import type { TransactionWithCategory } from '../repositories/transaction.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { userRepository } from '../repositories/user.repository';
import { getBudgetProgressService } from './budget.service';
import { getGoalsProgressService } from './goal.service';

export const getTransactionsByUserId = async (
  userId: string,
  financial?: { startDay: number; endDay: number },
  periodId?: string
) => {
  const storedPeriods = await financialPeriodRepository.findAllByUserWithTransactionCount(userId);

  const availablePeriods = storedPeriods.map((p) => ({
    id: p.id,
    startDate: p.startDate,
    endDate: p.endDate,
    label: formatPeriodLabel(p.startDate, p.endDate),
    transactionCount: p.transactionCount,
  }));

  let selectedPeriod: (typeof availablePeriods)[0] | undefined;

  if (periodId) {
    selectedPeriod = availablePeriods.find((p) => p.id === periodId);
  } else if (financial) {
    const currentPeriod = getCurrentFinancialPeriod(financial.startDay, financial.endDay);
    selectedPeriod = availablePeriods.find(
      (p) =>
        p.startDate.getTime() === currentPeriod.startDate.getTime() &&
        p.endDate.getTime() === currentPeriod.endDate.getTime()
    );
  }

  let transactions: TransactionWithCategory[];
  if (selectedPeriod) {
    transactions = await transactionRepository.findByPeriodId(userId, selectedPeriod.id);
  } else if (periodId) {
    transactions = [];
  } else {
    const today = getCurrentSaoPauloDate();
    const currentPeriod = financial
      ? getCurrentFinancialPeriod(financial.startDay, financial.endDay)
      : { startDate: new Date(today.getFullYear(), today.getMonth(), 1), endDate: today };
    transactions = await transactionRepository.findByUserId(userId, {
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
    });
  }

  return { transactions, availablePeriods, selectedPeriod };
};

export const getStatsOverview = async (
  transactions: TransactionWithCategory[],
  monthlyIncome: number
) => {
  return calculateStats(transactions, monthlyIncome);
};

export const getRecentTransactionsService = (transactions: TransactionWithCategory[]) => {
  return getRecentTransactions(transactions);
};

export const getDashboardOverviewService = async (
  monthlyIncome: number,
  periodTransactions: TransactionWithCategory[]
) => {
  const stats = await getStatsOverview(periodTransactions, monthlyIncome);
  const chart = calculatePeriodChartData(periodTransactions);
  const recentTransactions = getRecentTransactionsService(periodTransactions);

  return { stats, chart, recentTransactions };
};

export interface DashboardPreviews {
  subscriptions: {
    count: number;
    topMonthlyCost: number | null;
    topTitle: string | null;
  };
  comparison: {
    signal: 'up' | 'down' | 'stable';
    deltaPct: number | null;
    topHighlight: string | null;
  };
}

/**
 * Prévia compacta de F3/F4 p/ o dashboard (F5). 1 só findAllByUserId,
 * reaproveitado pelas duas heurísticas. Sem listas completas.
 */
export const getDashboardPreviewsService = async (
  userId: string,
  financialDayStart: number,
  financialDayEnd: number
): Promise<DashboardPreviews> => {
  const transactions = await transactionRepository.findAllByUserId(userId);

  const subs = groupSubscriptionCandidates(transactions);
  const topSub = subs[0] ?? null;

  const periods = getPreviousFinancialPeriods(financialDayStart, financialDayEnd, 4).map((p) => ({
    startDate: p.startDate,
    endDate: p.endDate,
    label: formatPeriodLabel(p.startDate, p.endDate),
  }));
  const cmp = buildComparison(transactions, periods);

  return {
    subscriptions: {
      count: subs.length,
      topMonthlyCost: topSub ? topSub.monthlyCost : null,
      topTitle: topSub ? topSub.title : null,
    },
    comparison: {
      signal: cmp.totals.signal,
      deltaPct: cmp.totals.deltaPct,
      topHighlight: cmp.highlights[0] ?? null,
    },
  };
};

export const getAvailablePeriodsService = async (userId: string) => {
  const storedPeriods = await financialPeriodRepository.findAllByUserWithTransactionCount(userId);

  return storedPeriods.map((p) => ({
    id: p.id,
    startDate: p.startDate,
    endDate: p.endDate,
    label: formatPeriodLabel(p.startDate, p.endDate),
    transactionCount: p.transactionCount,
  }));
};

type AlertSeverity = 'danger' | 'warning' | 'info';
type AlertPriority = 'high' | 'medium' | 'low';

export type Alert = {
  type: AlertSeverity;
  message: string;
  priority: AlertPriority;
  category?: string;
  goal?: string;
  percentage?: number;
  daysRemaining?: number;
};

export const calculatePlanningStats = (
  budgetProgress: BudgetProgress[],
  goalsProgress: (GoalWithMilestones | null)[],
  monthlyIncome: number
) => {
  const totalBudgeted = budgetProgress.reduce(
    (sum, budget) => sum + Number(budget.monthlyLimit),
    0
  );

  const totalSavingsGoal = goalsProgress.reduce(
    (sum, goal) => sum + Number(goal?.targetAmount ?? 0),
    0
  );

  const totalSaved = goalsProgress.reduce((sum, goal) => sum + Number(goal?.currentAmount ?? 0), 0);

  const savingsProgress =
    totalSavingsGoal > 0 ? Number(((totalSaved / totalSavingsGoal) * 100).toFixed(2)) : 0;

  const budgetPercentage =
    monthlyIncome > 0 ? Number(((totalBudgeted / monthlyIncome) * 100).toFixed(2)) : 0;

  const savingsPercentage =
    monthlyIncome > 0 ? Number(((totalSavingsGoal / monthlyIncome) * 100).toFixed(2)) : 0;

  return {
    totalBudgeted,
    totalSavingsGoal,
    totalSaved,
    savingsProgress,
    budgetPercentage,
    savingsPercentage,
    remainingToSave: Math.max(0, totalSavingsGoal - totalSaved),
    availableForBudget: Math.max(0, monthlyIncome - totalSavingsGoal),
  };
};

export const calculateAlerts = (
  stats: ReturnType<typeof calculatePlanningStats>,
  _monthlyIncome: number,
  budgetProgress: BudgetProgress[],
  goalsProgress: (GoalWithMilestones | null)[]
): Alert[] => {
  const alerts: Alert[] = [];

  budgetProgress.forEach((budget) => {
    const percentage = budget.percentage;

    if (percentage >= 100) {
      alerts.push({
        type: 'danger',
        message: `🚨 Orçamento de ${budget.category.name} foi excedido!`,
        priority: 'high',
        category: budget.category.name,
      });
    } else if (percentage >= 90) {
      alerts.push({
        type: 'warning',
        message: `⚠️ Orçamento de ${budget.category.name} está em 90%!`,
        priority: 'medium',
        category: budget.category.name,
      });
    } else if (percentage >= 80) {
      alerts.push({
        type: 'info',
        message: `⚠️ Orçamento de ${budget.category.name} está em 80%!`,
        priority: 'low',
        category: budget.category.name,
      });
    }
  });

  goalsProgress.forEach((goal) => {
    if (!goal) return;
    const daysRemaining = goal.progress?.daysRemaining || 0;
    const percentage = goal.progress?.percentage || 0;

    if (daysRemaining > 0 && daysRemaining <= 7) {
      alerts.push({
        type: 'warning',
        message: `⏰ Objetivo "${goal.title}" termina em ${daysRemaining} dia${
          daysRemaining > 1 ? 's' : ''
        }!`,
        priority: 'high',
        goal: goal.title,
        daysRemaining,
      });
    }

    if (daysRemaining > 7 && daysRemaining <= 30) {
      alerts.push({
        type: 'info',
        message: `⏰ Objetivo "${goal.title}" termina em ${daysRemaining} dias!`,
        priority: 'medium',
        goal: goal.title,
        daysRemaining,
      });
    }

    if (daysRemaining < 0) {
      alerts.push({
        type: 'danger',
        message: `🚨 Objetivo "${goal.title}" está atrasado há ${Math.abs(
          daysRemaining
        )} dia${Math.abs(daysRemaining) > 1 ? 's' : ''}!`,
        priority: 'high',
        goal: goal.title,
        daysRemaining,
      });
    }

    if (daysRemaining > 0 && daysRemaining <= 30 && percentage < 50) {
      alerts.push({
        type: 'warning',
        message: `⚠️ Objetivo "${goal.title}" tem apenas ${percentage}% de progresso e termina em ${daysRemaining} dias!`,
        priority: 'medium',
        goal: goal.title,
        percentage,
        daysRemaining,
      });
    }
  });

  if (stats.budgetPercentage > 100) {
    alerts.push({
      type: 'danger',
      message: '🚨 Seu orçamento total excede seu rendimento mensal!',
      priority: 'high',
    });
  } else if (stats.budgetPercentage > 80) {
    alerts.push({
      type: 'warning',
      message: '⚠️ Seu orçamento está usando mais de 80% do seu rendimento!',
      priority: 'medium',
    });
  }

  if (stats.savingsPercentage > 50) {
    alerts.push({
      type: 'info',
      message: '💰 Você está planejando poupar mais de 50% do seu rendimento!',
      priority: 'low',
    });
  }

  const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  alerts.sort((a, b) => (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0));

  return alerts;
};

export const getFinancialInsightsService = async (userId: string, monthlyIncome: number) => {
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

  const currentExpense = currentPeriodTx
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

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

export const getPlannerOverviewService = async (userId: string, monthlyIncome: number) => {
  const budgetProgress = await getBudgetProgressService(userId);
  const goalsProgress = await getGoalsProgressService(userId);
  const stats = calculatePlanningStats(budgetProgress, goalsProgress, monthlyIncome);
  const alerts = calculateAlerts(stats, monthlyIncome, budgetProgress, goalsProgress);

  return {
    stats,
    alerts,
  };
};
