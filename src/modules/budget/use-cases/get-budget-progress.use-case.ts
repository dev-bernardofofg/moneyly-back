import { sumAmounts } from '@core/helpers/amount';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { financialPeriodService } from '@modules/financial-period';
import { requireUser } from '@modules/user';
import type { BudgetProgress } from '../budget.types';
import { getBudgetStatus } from '../helpers/budget-status';
import { budgetRepository } from '../repositories/budget.repository';

export const getBudgetProgressUseCase = async (
  userId: string,
  periodId?: string
): Promise<BudgetProgress[]> => {
  await requireUser(userId);

  const [budgets, period] = await Promise.all([
    budgetRepository.getBudgetWithCategory(userId),
    periodId
      ? financialPeriodService.getPeriodById(periodId, userId)
      : financialPeriodService.ensureCurrentPeriodExists(userId),
  ]);

  const transactions = period ? await transactionRepository.findByPeriodId(userId, period.id) : [];

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
