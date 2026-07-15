import { HttpError } from '../../../validations/errors';
import { requireUser } from '../../../validations/user.validation';
import { budgetRepository } from '../repositories/budget.repository';

export const createBudgetUseCase = async (
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
