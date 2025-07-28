import { getCurrentFinancialPeriod } from "../helpers/financial-period";
import { BudgetRepository } from "../repositories/budget.repository";
import { TransactionRepository } from "../repositories/transaction.repository";
import { UserRepository } from "../repositories/user.repository";
import { validateBudgetExistsByCategoryId } from "../validations/budget.validation";
import { validateUserNotAuthenticated } from "../validations/user.validation";

export const createBudgetService = async (
  userId: string,
  data: {
    categoryId: string;
    monthlyLimit: number;
  }
) => {
  await validateUserNotAuthenticated(userId);

  const budget = await BudgetRepository.create({
    userId,
    categoryId: data.categoryId,
    monthlyLimit: data.monthlyLimit.toString(),
  });
  return budget;
};

export const getUserBudgetsService = async (userId: string) => {
  const budgets = await BudgetRepository.findByUserId(userId);
  return budgets;
};

export const updateBudgetService = async (
  userId: string,
  budgetId: string,
  data: { monthlyLimit: number }
) => {
  await validateUserNotAuthenticated(userId);

  const budget = await BudgetRepository.update(budgetId, {
    monthlyLimit: data.monthlyLimit.toString(),
  });

  return budget;
};

export const deleteBudgetService = async (userId: string, budgetId: string) => {
  await validateUserNotAuthenticated(userId);
  await validateBudgetExistsByCategoryId(budgetId);

  const budget = await BudgetRepository.delete(budgetId);
  return budget;
};

export const getUserBudgets = async (userId: string): Promise<any[]> => {
  // Buscar configurações do usuário
  const user = await UserRepository.findById(userId);
  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const financialDayStart = user.financialDayStart ?? 1;
  const financialDayEnd = user.financialDayEnd ?? 31;

  if (!financialDayStart || !financialDayEnd) {
    throw new Error("Configuração de período financeiro não encontrada");
  }

  const currentPeriod = getCurrentFinancialPeriod(
    financialDayStart,
    financialDayEnd
  );

  // Buscar orçamentos
  const budgets = await BudgetRepository.getBudgetWithCategory(userId);

  // Buscar transações do período atual
  const transactions = await TransactionRepository.findByUserId(userId, {
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
  });

  // Calcular progresso para cada orçamento
  const budgetsWithProgress = budgets.map((budget) => {
    const categoryExpenses = transactions
      .filter(
        (tx: any) =>
          tx.type === "expense" && tx.category.id === budget.category.id
      )
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

    const percentage = Math.min(
      (categoryExpenses / Number(budget.monthlyLimit)) * 100,
      100
    );
    const remaining = Math.max(
      0,
      Number(budget.monthlyLimit) - categoryExpenses
    );

    return {
      ...budget,
      spent: categoryExpenses,
      remaining,
      percentage: Math.round(percentage * 100) / 100,
      status: getBudgetStatus(percentage),
    };
  });

  return budgetsWithProgress;
};

export const updateBudget = async (
  userId: string,
  budgetId: string,
  data: { monthlyLimit: number }
) => {
  const budget = await BudgetRepository.update(budgetId, {
    monthlyLimit: data.monthlyLimit.toString(),
  });

  if (!budget) {
    throw new Error("Orçamento não encontrado");
  }

  // Verificar se o orçamento pertence ao usuário
  if (budget.userId !== userId) {
    throw new Error("Orçamento não pertence ao usuário");
  }

  return budget;
};

export const deleteBudget = async (
  userId: string,
  budgetId: string
): Promise<boolean> => {
  // Primeiro, buscar o orçamento específico para verificar se existe e pertence ao usuário
  const targetBudget = await BudgetRepository.findByIdAndUserId(
    budgetId,
    userId
  );

  if (!targetBudget) {
    throw new Error("Orçamento não encontrado ou não pertence ao usuário");
  }

  // Se chegou até aqui, o orçamento existe e pertence ao usuário
  // Agora podemos deletar com segurança
  const deleted = await BudgetRepository.delete(budgetId);

  if (!deleted) {
    throw new Error("Erro ao deletar orçamento");
  }

  return true;
};

export const getBudgetProgressService = async (
  userId: string
): Promise<any[]> => {
  const user = await validateUserNotAuthenticated(userId);

  const financialDayStart = user.financialDayStart ?? 1;
  const financialDayEnd = user.financialDayEnd ?? 31;
  const currentPeriod = getCurrentFinancialPeriod(
    financialDayStart,
    financialDayEnd
  );

  // Buscar orçamentos
  const budgets = await BudgetRepository.getBudgetWithCategory(userId);

  // Buscar transações do período atual
  const transactions = await TransactionRepository.findByUserId(userId, {
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
  });

  // Calcular progresso para cada orçamento
  const budgetProgress = budgets.map((budget) => {
    const categoryExpenses = transactions
      .filter(
        (tx: any) =>
          tx.type === "expense" && tx.category.id === budget.category.id
      )
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

    const percentage = Math.min(
      (categoryExpenses / Number(budget.monthlyLimit)) * 100,
      100
    );
    const remaining = Math.max(
      0,
      Number(budget.monthlyLimit) - categoryExpenses
    );

    return {
      ...budget,
      spent: categoryExpenses,
      remaining,
      percentage: Math.round(percentage * 100) / 100,
      status: getBudgetStatus(percentage),
    };
  });

  return budgetProgress;
};

export const getBudgetStatus = (percentage: number): string => {
  if (percentage >= 100) return "exceeded";
  if (percentage >= 90) return "warning";
  if (percentage >= 75) return "attention";
  return "safe";
};

export const getBudgetProgressByCategory = async (
  userId: string,
  categoryId: string
): Promise<any> => {
  const user = await validateUserNotAuthenticated(userId);

  const financialDayStart = user.financialDayStart ?? 1;
  const financialDayEnd = user.financialDayEnd ?? 31;
  const currentPeriod = getCurrentFinancialPeriod(
    financialDayStart,
    financialDayEnd
  );

  const transactions = await TransactionRepository.findByUserId(userId, {
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
  });

  const categoryExpenses = transactions
    .filter((tx: any) => tx.type === "expense" && tx.category.id === categoryId)
    .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

  const budget = await BudgetRepository.findByCategoryId(categoryId);

  const percentage = Math.min(
    (categoryExpenses / Number(budget!.monthlyLimit)) * 100,
    100
  );

  return {
    percentage,
    status: getBudgetStatus(percentage),
  };
};
