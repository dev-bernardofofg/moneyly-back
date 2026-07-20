import { sumAmounts } from '@core/helpers/amount';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { financialPeriodService } from '@modules/financial-period';
import { HttpError } from '@core/errors/http-error';
import { getBudgetStatus } from '../helpers/budget-status';
import { budgetRepository } from '../repositories/budget.repository';

export const listBudgetsUseCase = async (userId: string, periodId?: string) => {
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
