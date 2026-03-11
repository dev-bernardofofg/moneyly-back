import type { Category } from "../db/schema";
import {
  formatPeriodLabel,
  getCurrentFinancialPeriod,
} from "../helpers/financial-period";
import {
  calculateExpensesByCategory,
  calculateMonthlyHistory,
  calculateStats,
} from "../helpers/handlers/overview-handlers";
import { CategoryRepository } from "../repositories/categories.repository";
import { FinancialPeriodRepository } from "../repositories/financial-period.repository";
import type { TransactionWithCategory } from "../repositories/transaction.repository";
import { TransactionRepository } from "../repositories/transaction.repository";
import { getBudgetProgressService } from "./budget.service";
import { getGoalsProgressService } from "./goal.service";

export const getTransactionsByUserId = async (
  userId: string,
  financial?: { startDay: number; endDay: number },
  periodId?: string
) => {
  // Buscar períodos do banco com contagem real
  const storedPeriods =
    await FinancialPeriodRepository.findAllByUserWithTransactionCount(userId);

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
    const currentPeriod = getCurrentFinancialPeriod(
      financial.startDay,
      financial.endDay
    );
    selectedPeriod = availablePeriods.find(
      (p) =>
        p.startDate.getTime() === currentPeriod.startDate.getTime() &&
        p.endDate.getTime() === currentPeriod.endDate.getTime()
    );
  }

  // Buscar transações do período selecionado por UUID real
  let transactions: TransactionWithCategory[];
  if (selectedPeriod) {
    transactions = await TransactionRepository.findByPeriodId(
      userId,
      selectedPeriod.id
    );
  } else if (periodId) {
    // periodId fornecido mas não encontrado nos períodos do usuário
    transactions = [];
  } else {
    // Sem período selecionado: buscar transações do período atual por data (fallback)
    const currentPeriod = financial
      ? getCurrentFinancialPeriod(financial.startDay, financial.endDay)
      : { startDate: new Date(), endDate: new Date() };
    transactions = await TransactionRepository.findByUserId(userId, {
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

export const getMonthlyHistory = async (
  transactions: TransactionWithCategory[],
  categories: Category[]
) => {
  return calculateMonthlyHistory(transactions, categories);
};

export const getExpensesByCategory = async (
  transactions: TransactionWithCategory[],
  categories: Category[]
) => {
  return calculateExpensesByCategory(transactions, categories);
};

export const getDashboardOverviewService = async (
  userId: string,
  monthlyIncome: number,
  periodTransactions: TransactionWithCategory[]
) => {
  const categories = await CategoryRepository.findByUserId(userId);

  const [stats, monthlyHistory, expensesByCategory] = await Promise.all([
    getStatsOverview(periodTransactions, monthlyIncome),
    getMonthlyHistory(periodTransactions, categories),
    getExpensesByCategory(periodTransactions, categories),
  ]);

  return {
    stats,
    monthlyHistory,
    expensesByCategory,
  };
};

export const getAvailablePeriodsService = async (userId: string) => {
  const storedPeriods =
    await FinancialPeriodRepository.findAllByUserWithTransactionCount(userId);

  return storedPeriods.map((p) => ({
    id: p.id,
    startDate: p.startDate,
    endDate: p.endDate,
    label: formatPeriodLabel(p.startDate, p.endDate),
    transactionCount: p.transactionCount,
  }));
};

export const calculatePlanningStats = (
  budgetProgress: any[],
  goalsProgress: any[],
  monthlyIncome: number
) => {
  // Calcular total orçado (soma de todos os orçamentos)
  const totalBudgeted = budgetProgress.reduce(
    (sum, budget) => sum + Number(budget.monthlyLimit),
    0
  );

  // Calcular meta de poupança (soma das metas ativas)
  const totalSavingsGoal = goalsProgress.reduce(
    (sum, goal) => sum + Number(goal.targetAmount),
    0
  );

  // Calcular já poupado (soma do valor atual de todos os objetivos ativos)
  const totalSaved = goalsProgress.reduce(
    (sum, goal) => sum + Number(goal.currentAmount || 0),
    0
  );

  // Calcular percentual de progresso da poupança
  const savingsProgress =
    totalSavingsGoal > 0
      ? Number(((totalSaved / totalSavingsGoal) * 100).toFixed(2))
      : 0;

  // Calcular percentual do orçamento em relação ao rendimento
  const budgetPercentage =
    monthlyIncome > 0
      ? Number(((totalBudgeted / monthlyIncome) * 100).toFixed(2))
      : 0;

  // Calcular percentual da poupança em relação ao rendimento
  const savingsPercentage =
    monthlyIncome > 0
      ? Number(((totalSavingsGoal / monthlyIncome) * 100).toFixed(2))
      : 0;

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
  stats: any,
  _monthlyIncome: number,
  budgetProgress: any[],
  goalsProgress: any[]
) => {
  const alerts: any[] = [];

  // Alertas de orçamento por categoria
  budgetProgress.forEach((budget) => {
    const percentage = budget.percentage;

    if (percentage >= 100) {
      alerts.push({
        type: "danger",
        message: `🚨 Orçamento de ${budget.category.name} foi excedido!`,
        priority: "high",
        category: budget.category.name,
      });
    } else if (percentage >= 90) {
      alerts.push({
        type: "warning",
        message: `⚠️ Orçamento de ${budget.category.name} está em 90%!`,
        priority: "medium",
        category: budget.category.name,
      });
    } else if (percentage >= 80) {
      alerts.push({
        type: "info",
        message: `⚠️ Orçamento de ${budget.category.name} está em 80%!`,
        priority: "low",
        category: budget.category.name,
      });
    }
  });

  // Alertas de objetivos de poupança
  goalsProgress.forEach((goal) => {
    const daysRemaining = goal.progress?.daysRemaining || 0;
    const percentage = goal.progress?.percentage || 0;

    // Alerta para objetivos próximos do prazo (menos de 7 dias)
    if (daysRemaining > 0 && daysRemaining <= 7) {
      alerts.push({
        type: "warning",
        message: `⏰ Objetivo "${goal.title}" termina em ${daysRemaining} dia${
          daysRemaining > 1 ? "s" : ""
        }!`,
        priority: "high",
        goal: goal.title,
        daysRemaining,
      });
    }

    // Alerta para objetivos próximos do prazo (menos de 30 dias)
    if (daysRemaining > 7 && daysRemaining <= 30) {
      alerts.push({
        type: "info",
        message: `⏰ Objetivo "${goal.title}" termina em ${daysRemaining} dias!`,
        priority: "medium",
        goal: goal.title,
        daysRemaining,
      });
    }

    // Alerta para objetivos atrasados
    if (daysRemaining < 0) {
      alerts.push({
        type: "danger",
        message: `🚨 Objetivo "${goal.title}" está atrasado há ${Math.abs(
          daysRemaining
        )} dia${Math.abs(daysRemaining) > 1 ? "s" : ""}!`,
        priority: "high",
        goal: goal.title,
        daysRemaining,
      });
    }

    // Alerta para objetivos com baixo progresso mas próximos do prazo
    if (daysRemaining > 0 && daysRemaining <= 30 && percentage < 50) {
      alerts.push({
        type: "warning",
        message: `⚠️ Objetivo "${goal.title}" tem apenas ${percentage}% de progresso e termina em ${daysRemaining} dias!`,
        priority: "medium",
        goal: goal.title,
        percentage,
        daysRemaining,
      });
    }
  });

  // Alertas de planejamento geral
  if (stats.budgetPercentage > 100) {
    alerts.push({
      type: "danger",
      message: "🚨 Seu orçamento total excede seu rendimento mensal!",
      priority: "high",
    });
  } else if (stats.budgetPercentage > 80) {
    alerts.push({
      type: "warning",
      message: "⚠️ Seu orçamento está usando mais de 80% do seu rendimento!",
      priority: "medium",
    });
  }

  if (stats.savingsPercentage > 50) {
    alerts.push({
      type: "info",
      message: "💰 Você está planejando poupar mais de 50% do seu rendimento!",
      priority: "low",
    });
  }

  // Ordenar alertas por prioridade (high > medium > low)
  const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  alerts.sort(
    (a, b) =>
      (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0)
  );

  return alerts;
};

export const getPlannerOverviewService = async (
  userId: string,
  monthlyIncome: number
) => {
  const budgetProgress = await getBudgetProgressService(userId);
  const goalsProgress = await getGoalsProgressService(userId);
  const stats = calculatePlanningStats(
    budgetProgress,
    goalsProgress,
    monthlyIncome
  );
  const alerts = calculateAlerts(
    stats,
    monthlyIncome,
    budgetProgress,
    goalsProgress
  );

  return {
    stats,
    alerts,
  };
};
