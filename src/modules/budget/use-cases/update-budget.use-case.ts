import { requireUser } from '../../user';
import { budgetRepository } from '../repositories/budget.repository';
import { validateBudgetExists } from '../validations/budget.validation';

export const updateBudgetUseCase = async (
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
