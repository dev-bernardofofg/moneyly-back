import type { GoalWithMilestones } from '@modules/goal/repositories/IGoalRepository';
import type { BudgetProgress } from '@modules/budget';

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
