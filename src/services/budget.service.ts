import { getCurrentFinancialPeriod } from "../helpers/financial-period";
import { BudgetRepository } from "../repositories/budget.repository";
import { TransactionRepository } from "../repositories/transaction.repository";
import { UserRepository } from "../repositories/user.repository";
import { validateBudgetExists } from "../validations/budget.validation";
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
  // Usar getBudgetWithCategory para incluir informação de categoria
  const budgets = await BudgetRepository.getBudgetWithCategory(userId);

  // Buscar usuário para pegar período financeiro
  const user = await UserRepository.findById(userId);
  if (!user) return budgets;

  const currentPeriod = getCurrentFinancialPeriod(
    user.financialDayStart ?? 1,
    user.financialDayEnd ?? 31
  );

  // Adicionar campos de progresso para cada budget
  const budgetsWithProgress = await Promise.all(
    budgets.map(async (budget) => {
      // Buscar transações do período atual para essa categoria
      const transactions = await TransactionRepository.findByUserId(userId, {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
      });

      const spent = transactions
        .filter(
          (tx) => tx.type === "expense" && tx.category.id === budget.category.id
        )
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const monthlyLimit = Number(budget.monthlyLimit);
      const remaining = monthlyLimit - spent;
      const percentage =
        monthlyLimit > 0 ? Math.round((spent / monthlyLimit) * 100) : 0;

      let status: "safe" | "warning" | "danger" = "safe";
      if (percentage >= 90) status = "danger";
      else if (percentage >= 70) status = "warning";

      return {
        ...budget,
        spent,
        remaining,
        percentage,
        status,
      };
    })
  );

  return budgetsWithProgress;
};

export const updateBudgetService = async (
  userId: string,
  budgetId: string,
  data: { monthlyLimit: number }
) => {
  await validateUserNotAuthenticated(userId);
  await validateBudgetExists(budgetId, userId);

  const budget = await BudgetRepository.update(budgetId, {
    monthlyLimit: data.monthlyLimit.toString(),
  });

  return budget;
};

export const deleteBudgetService = async (userId: string, budgetId: string) => {
  await validateUserNotAuthenticated(userId);
  await validateBudgetExists(budgetId, userId);

  const budget = await BudgetRepository.delete(budgetId);
  return budget;
};

export const getUserBudgets = async (userId: string): Promise<any[]> => {
  // Buscar configurações do usuário
  const user = await UserRepository.findById(userId);
  if (!user) {
    throw new Error("Usuário não encontrado. Por favor, faça login novamente.");
  }

  const financialDayStart = user.financialDayStart ?? 1;
  const financialDayEnd = user.financialDayEnd ?? 31;

  if (!financialDayStart || !financialDayEnd) {
    throw new Error(
      "Configuração de período financeiro não encontrada. Por favor, configure seu período financeiro nas configurações."
    );
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
    throw new Error(
      "Orçamento não encontrado. Verifique se o ID está correto."
    );
  }

  // Verificar se o orçamento pertence ao usuário
  if (budget.userId !== userId) {
    throw new Error("Você não tem permissão para modificar este orçamento.");
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
    throw new Error(
      "Orçamento não encontrado. Verifique se o ID está correto e se você tem permissão para acessá-lo."
    );
  }

  // Se chegou até aqui, o orçamento existe e pertence ao usuário
  // Agora podemos deletar com segurança
  const deleted = await BudgetRepository.delete(budgetId);

  if (!deleted) {
    throw new Error(
      "Não foi possível deletar o orçamento. Por favor, tente novamente."
    );
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
    .filter((tx) => tx.type === "expense" && tx.category.id === categoryId)
    .reduce((sum: number, tx) => sum + Number(tx.amount), 0);

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
