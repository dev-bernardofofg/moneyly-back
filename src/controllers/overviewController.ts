import { format, subMonths } from "date-fns";
import { Response } from "express";
import { getCurrentFinancialPeriod } from "../lib/financialPeriod";
import { ResponseHandler } from "../lib/ResponseHandler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { CategoryRepository } from "../repositories/categoriesRepository";
import { TransactionRepository } from "../repositories/transactionRepository";
import { UserRepository } from "../repositories/userRepository";

export const getDashboardOverview = async (
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

    // Buscar transações do período atual
    const currentPeriodTransactions = await TransactionRepository.findByUserId(
      req.userId,
      {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
      }
    );

    // Buscar transações dos últimos 6 meses para histórico
    const sixMonthsAgo = subMonths(new Date(), 6);
    const historicalTransactions = await TransactionRepository.findByUserId(
      req.userId,
      {
        startDate: sixMonthsAgo,
        endDate: new Date(),
      }
    );

    // Buscar categorias do usuário
    const categories = await CategoryRepository.findByUserId(req.userId);

    // Calcular stats do período atual
    const stats = calculateStats(
      currentPeriodTransactions,
      user.monthlyIncome ?? 0
    );

    // Calcular histórico mensal
    const monthlyHistory = calculateMonthlyHistory(
      historicalTransactions,
      categories
    );

    // Calcular gastos por categoria
    const expensesByCategory = calculateExpensesByCategory(
      currentPeriodTransactions,
      categories
    );

    // Calcular alertas
    const alerts = calculateAlerts(stats, user.monthlyIncome ?? 0);

    return ResponseHandler.success(
      res,
      {
        stats,
        currentPeriod: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          description: `Período financeiro: ${format(
            currentPeriod.startDate,
            "dd/MM/yyyy"
          )} a ${format(currentPeriod.endDate, "dd/MM/yyyy")}`,
        },
        monthlyHistory,
        expensesByCategory,
        alerts,
        transactionsCount: currentPeriodTransactions.length,
      },
      "Dados do dashboard recuperados com sucesso"
    );
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return ResponseHandler.serverError(res);
  }
};

// Funções auxiliares
function calculateStats(transactions: any[], monthlyIncome: number) {
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = monthlyIncome - totalExpense;
  const percentUsed =
    monthlyIncome > 0
      ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
      : null;

  return {
    totalIncome,
    totalExpense,
    balance,
    percentUsed,
    remainingBudget: Math.max(0, monthlyIncome - totalExpense),
  };
}

function calculateMonthlyHistory(transactions: any[], categories: any[]) {
  // Criar um mapa de categorias para facilitar a busca
  const categoriesMap = categories.reduce((map, category) => {
    map[category.id] = category;
    return map;
  }, {} as Record<string, any>);

  // Transformar transações em formato desejado
  const monthlyHistory = transactions.map((tx) => {
    const category = categoriesMap[tx.categoryId];

    return {
      id: tx.id,
      type: tx.type, // Mantém "income" ou "expense"
      amount: tx.amount,
      date: format(new Date(tx.date), "dd/MM/yyyy"),
      category: category ? category.name : "Categoria não encontrada",
      description: tx.description || "",
    };
  });

  // Ordenar por data (mais recente primeiro) e pegar apenas as últimas 5
  return monthlyHistory
    .sort((a, b) => {
      const dateA = new Date(a.date.split("/").reverse().join("-"));
      const dateB = new Date(b.date.split("/").reverse().join("-"));
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5); // Retorna apenas as últimas 5 transações
}

function calculateExpensesByCategory(transactions: any[], categories: any[]) {
  const expensesByCategory: Record<string, any> = {};

  // Inicializar todas as categorias com 0
  categories.forEach((category) => {
    expensesByCategory[category.id] = {
      id: category.id,
      name: category.name,
      amount: 0,
      percentage: 0,
    };
  });

  // Calcular gastos por categoria
  const expenseTransactions = transactions.filter(
    (tx) => tx.type === "expense"
  );
  const totalExpenses = expenseTransactions.reduce(
    (sum, tx) => sum + tx.amount,
    0
  );

  expenseTransactions.forEach((tx) => {
    if (expensesByCategory[tx.categoryId]) {
      expensesByCategory[tx.categoryId].amount += tx.amount;
    }
  });

  // Calcular percentuais
  Object.keys(expensesByCategory).forEach((categoryId) => {
    const category = expensesByCategory[categoryId];
    category.percentage =
      totalExpenses > 0
        ? Number(((category.amount / totalExpenses) * 100).toFixed(2))
        : 0;
  });

  return Object.values(expensesByCategory)
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function calculateAlerts(stats: any, monthlyIncome: number) {
  const alerts: string[] = [];

  if (stats.percentUsed !== null) {
    if (stats.percentUsed >= 90) {
      alerts.push("⚠️ Você já usou mais de 90% do seu rendimento mensal!");
    } else if (stats.percentUsed >= 80) {
      alerts.push("⚠️ Você já usou mais de 80% do seu rendimento mensal!");
    } else if (stats.percentUsed >= 70) {
      alerts.push("⚠️ Você já usou mais de 70% do seu rendimento mensal!");
    }
  }

  if (stats.balance < 0) {
    alerts.push("🚨 Você está gastando mais do que seu rendimento mensal!");
  }

  if (stats.remainingBudget < monthlyIncome * 0.1) {
    alerts.push("💰 Resta menos de 10% do seu orçamento mensal!");
  }

  return alerts;
}
