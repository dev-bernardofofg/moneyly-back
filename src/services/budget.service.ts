import { budgetRepository } from '../repositories/budget.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { financialPeriodService } from './financial-period.service';
import { validateBudgetExists } from '../validations/budget.validation';
import { requireUser } from '../validations/user.validation';
import type { BudgetProgress } from '../types/budget.types';
import { HttpError } from '../validations/errors';

export const createBudgetService = async (
  userId: string,
  data: {
    categoryId: string;
    monthlyLimit: number;
  }
) => {
  await requireUser(userId);

  const existing = await budgetRepository.findByUserIdAndCategoryId(userId, data.categoryId);
  if (existing) throw new HttpError(409, 'Já existe um orçamento para esta categoria');

  const budget = await budgetRepository.create({
    userId,
    categoryId: data.categoryId,
    monthlyLimit: data.monthlyLimit.toString(),
  });
  return budget;
};

export const getUserBudgetsService = async (userId: string, periodId?: string) => {
  const [budgets, period] = await Promise.all([
    budgetRepository.getBudgetWithCategory(userId),
    periodId
      ? financialPeriodService.getPeriodById(periodId, userId)
      : financialPeriodService.ensureCurrentPeriodExists(userId),
  ]);

  if (!period) throw new HttpError(404, 'Período não encontrado');

  const currentPeriod = period;

  const transactions = await transactionRepository.findByPeriodId(userId, currentPeriod.id);

  return budgets.map((budget) => {
    const spent = transactions
      .filter((tx) => tx.type === 'expense' && tx.category.id === budget.category.id)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const monthlyLimit = Number(budget.monthlyLimit);
    const remaining = monthlyLimit - spent;
    const percentage = monthlyLimit > 0 ? Math.round((spent / monthlyLimit) * 100) : 0;

    return {
      ...budget,
      spent,
      remaining,
      percentage,
      status: getBudgetStatus(percentage),
    };
  });
};

export const updateBudgetService = async (
  userId: string,
  budgetId: string,
  data: { monthlyLimit: number }
) => {
  await requireUser(userId);
  await validateBudgetExists(budgetId, userId);

  const budget = await budgetRepository.update(budgetId, {
    monthlyLimit: data.monthlyLimit.toString(),
  });

  return budget;
};

export const deleteBudgetService = async (userId: string, budgetId: string) => {
  await requireUser(userId);
  await validateBudgetExists(budgetId, userId);

  const budget = await budgetRepository.delete(budgetId);
  return budget;
};

export const getBudgetProgressService = async (userId: string): Promise<BudgetProgress[]> => {
  await requireUser(userId);

  const [budgets, currentPeriod] = await Promise.all([
    budgetRepository.getBudgetWithCategory(userId),
    financialPeriodService.ensureCurrentPeriodExists(userId),
  ]);

  const transactions = await transactionRepository.findByPeriodId(userId, currentPeriod.id);

  return budgets.map((budget) => {
    const categoryExpenses = transactions
      .filter((tx) => tx.type === 'expense' && tx.category.id === budget.category.id)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const percentage = Math.min((categoryExpenses / Number(budget.monthlyLimit)) * 100, 100);
    const remaining = Math.max(0, Number(budget.monthlyLimit) - categoryExpenses);

    return {
      ...budget,
      spent: categoryExpenses,
      remaining,
      percentage: Math.round(percentage * 100) / 100,
      status: getBudgetStatus(percentage),
    };
  });
};

export const getBudgetStatus = (percentage: number): string => {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 90) return 'warning';
  if (percentage >= 75) return 'attention';
  return 'safe';
};

export const getBudgetProgressByCategory = async (
  userId: string,
  categoryId: string
): Promise<{ percentage: number; status: string }> => {
  await requireUser(userId);

  const [currentPeriod, budget] = await Promise.all([
    financialPeriodService.ensureCurrentPeriodExists(userId),
    budgetRepository.findByCategoryId(categoryId),
  ]);

  if (!budget) {
    return { percentage: 0, status: 'safe' };
  }

  const transactions = await transactionRepository.findByPeriodId(userId, currentPeriod.id);

  const categoryExpenses = transactions
    .filter((tx) => tx.type === 'expense' && tx.category.id === categoryId)
    .reduce((sum: number, tx) => sum + Number(tx.amount), 0);

  const percentage = Math.min((categoryExpenses / Number(budget.monthlyLimit)) * 100, 100);

  return {
    percentage,
    status: getBudgetStatus(percentage),
  };
};
