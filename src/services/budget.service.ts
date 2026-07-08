import { sumAmounts } from '../helpers/amount';
import { budgetRepository } from '../repositories/budget.repository';
import type { IBudgetRepository } from '../repositories/interfaces/IBudgetRepository';
import type { ITransactionRepository } from '../repositories/interfaces/ITransactionRepository';
import { transactionRepository } from '../repositories/transaction.repository';
import { financialPeriodService } from './financial-period.service';
import { validateBudgetExists } from '../validations/budget.validation';
import { requireUser } from '../validations/user.validation';
import type { BudgetProgress } from '../types/budget.types';
import { ConflictError, NotFoundError } from './errors';

export interface BudgetServiceDeps {
  budgetRepository: Pick<
    IBudgetRepository,
    | 'create'
    | 'findByUserIdAndCategoryId'
    | 'findByCategoryId'
    | 'update'
    | 'delete'
    | 'getBudgetWithCategory'
  >;
  transactionRepository: Pick<ITransactionRepository, 'findByPeriodId'>;
  financialPeriodService: Pick<
    typeof financialPeriodService,
    'ensureCurrentPeriodExists' | 'getPeriodById'
  >;
  requireUser: typeof requireUser;
  validateBudgetExists: typeof validateBudgetExists;
}

export const getBudgetStatus = (percentage: number): string => {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 90) return 'warning';
  if (percentage >= 75) return 'attention';
  return 'safe';
};

export const makeBudgetService = (deps: BudgetServiceDeps) => {
  const {
    budgetRepository,
    transactionRepository,
    financialPeriodService,
    requireUser,
    validateBudgetExists,
  } = deps;

  const create = async (userId: string, data: { categoryId: string; monthlyLimit: number }) => {
    await requireUser(userId);

    const existing = await budgetRepository.findByUserIdAndCategoryId(userId, data.categoryId);
    if (existing) throw new ConflictError('Já existe um orçamento para esta categoria');

    return budgetRepository.create({
      userId,
      categoryId: data.categoryId,
      monthlyLimit: data.monthlyLimit.toString(),
    });
  };

  const getUserBudgets = async (userId: string, periodId?: string) => {
    const [budgets, period] = await Promise.all([
      budgetRepository.getBudgetWithCategory(userId),
      periodId
        ? financialPeriodService.getPeriodById(periodId, userId)
        : financialPeriodService.ensureCurrentPeriodExists(userId),
    ]);

    if (!period) throw new NotFoundError('Período não encontrado');

    const currentPeriod = period;

    const transactions = await transactionRepository.findByPeriodId(userId, currentPeriod.id);

    return budgets.map((budget) => {
      const spent = sumAmounts(
        transactions.filter((tx) => tx.type === 'expense' && tx.category.id === budget.category.id)
      );

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

  const update = async (userId: string, budgetId: string, data: { monthlyLimit: number }) => {
    await requireUser(userId);
    await validateBudgetExists(budgetId, userId);

    return budgetRepository.update(budgetId, {
      monthlyLimit: data.monthlyLimit.toString(),
    });
  };

  const remove = async (userId: string, budgetId: string) => {
    await requireUser(userId);
    await validateBudgetExists(budgetId, userId);

    return budgetRepository.delete(budgetId);
  };

  const getProgress = async (userId: string): Promise<BudgetProgress[]> => {
    await requireUser(userId);

    const [budgets, currentPeriod] = await Promise.all([
      budgetRepository.getBudgetWithCategory(userId),
      financialPeriodService.ensureCurrentPeriodExists(userId),
    ]);

    const transactions = await transactionRepository.findByPeriodId(userId, currentPeriod.id);

    return budgets.map((budget) => {
      const categoryExpenses = sumAmounts(
        transactions.filter((tx) => tx.type === 'expense' && tx.category.id === budget.category.id)
      );

      const monthlyLimit = Number(budget.monthlyLimit);
      const percentage =
        monthlyLimit > 0 ? Math.min((categoryExpenses / monthlyLimit) * 100, 100) : 0;
      const remaining = Math.max(0, monthlyLimit - categoryExpenses);

      return {
        ...budget,
        spent: categoryExpenses,
        remaining,
        percentage: Math.round(percentage * 100) / 100,
        status: getBudgetStatus(percentage),
      };
    });
  };

  const getProgressByCategory = async (
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

    const categoryExpenses = sumAmounts(
      transactions.filter((tx) => tx.type === 'expense' && tx.category.id === categoryId)
    );

    const percentage = Math.min((categoryExpenses / Number(budget.monthlyLimit)) * 100, 100);

    return {
      percentage,
      status: getBudgetStatus(percentage),
    };
  };

  return {
    create,
    getUserBudgets,
    update,
    delete: remove,
    getProgress,
    getProgressByCategory,
  };
};

// Composition root: instância default com os singletons reais.
export const budgetService = makeBudgetService({
  budgetRepository,
  transactionRepository,
  financialPeriodService,
  requireUser,
  validateBudgetExists,
});

// Alias retrocompatível (overview/notification consomem até migrarem).
export const getBudgetProgressService = budgetService.getProgress;
