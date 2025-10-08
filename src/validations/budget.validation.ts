import { BudgetRepository } from "../repositories/budget.repository";
import { HttpError } from "../services/errors";

export const validateBudgetExistsByUserId = async (
  categoryId: string,
  userId: string
) => {
  const budget = await BudgetRepository.findByIdAndUserId(categoryId, userId);
  if (!budget) {
    throw new HttpError(404, "Categoria não encontrada");
  } else {
    throw new HttpError(404, "Já existe um orçamento para esta categoria");
  }
};

export const validateBudgetExistsByCategoryId = async (categoryId: string) => {
  const budget = await BudgetRepository.findByCategoryId(categoryId);
  if (!budget) {
    throw new HttpError(404, "Categoria não encontrada");
  }
};

export const validateBudgetExists = async (
  budgetId: string,
  userId: string
) => {
  const budget = await BudgetRepository.findByIdAndUserId(budgetId, userId);
  if (!budget) {
    throw new HttpError(404, "Orçamento não encontrado");
  }
  return budget;
};
