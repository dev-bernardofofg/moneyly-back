import { requireUser } from '../../user';
import { budgetRepository } from '../repositories/budget.repository';
import { validateBudgetExists } from '../validations/budget.validation';

export const deleteBudgetUseCase = async (userId: string, budgetId: string) => {
  await requireUser(userId);
  await validateBudgetExists(budgetId, userId);

  const budget = await budgetRepository.delete(budgetId);
  return budget;
};
