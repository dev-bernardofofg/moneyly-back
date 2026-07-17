import { sumAmounts } from '../../../core/helpers/amount';
import { transactionRepository } from '../../transaction/repositories/transaction.repository';
import { financialPeriodService } from '../../financial-period';
import { requireUser } from '../../user';
import { getBudgetStatus } from '../helpers/budget-status';
import { budgetRepository } from '../repositories/budget.repository';

export const getBudgetProgressByCategoryUseCase = async (
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
