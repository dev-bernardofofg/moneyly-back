import { Response } from "express";
import { getCurrentFinancialPeriod } from "../lib/financialPeriod";
import { ResponseHandler } from "../lib/ResponseHandler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { UserRepository } from "../repositories/userRepository";
import { CategoryBudgetService } from "../services/categoryBudgetService";
import { SavingsGoalService } from "../services/savingsGoalService";

export const getPlannerOverview = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const user = await UserRepository.findById(req.userId);
    if (!user) {
      return ResponseHandler.notFound(res, "Usuário não encontrado");
    }

    // Buscar dados do período financeiro atual
    const currentPeriod = getCurrentFinancialPeriod(
      user.financialDayStart ?? 1,
      user.financialDayEnd ?? 31
    );

    // Buscar orçamentos por categoria
    const budgetService = new CategoryBudgetService();
    const budgetProgress = await budgetService.getBudgetProgress(req.userId);

    // Buscar objetivos de poupança
    const goalService = new SavingsGoalService();
    const goalsProgress = await goalService.getGoalsProgress(req.userId);

    // Calcular stats de planejamento
    const stats = calculatePlanningStats(
      budgetProgress,
      goalsProgress,
      Number(user.monthlyIncome) ?? 0
    );

    // Calcular alertas
    const alerts = calculateAlerts(
      stats,
      Number(user.monthlyIncome) ?? 0,
      budgetProgress,
      goalsProgress
    );

    return ResponseHandler.success(
      res,
      {
        stats,
        currentPeriod: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          description: `Período financeiro: ${currentPeriod.startDate.toLocaleDateString(
            "pt-BR"
          )} a ${currentPeriod.endDate.toLocaleDateString("pt-BR")}`,
        },
        alerts,
      },
      "Stats do planejamento recuperados com sucesso"
    );
  } catch (error) {
    console.error("Erro ao buscar stats do planejamento:", error);
    return ResponseHandler.serverError(res);
  }
};

// Funções auxiliares
function calculatePlanningStats(
  budgetProgress: any[],
  goalsProgress: any[],
  monthlyIncome: number
) {
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
}

function calculateAlerts(
  stats: any,
  monthlyIncome: number,
  budgetProgress: any[],
  goalsProgress: any[]
) {
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
  alerts.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  return alerts;
}
