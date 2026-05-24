import { ResponseHandler } from '../helpers/response-handler';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import { BadRequestError } from '../services/errors';
import {
  createBudgetService,
  deleteBudgetService,
  getUserBudgetsService,
  updateBudgetService,
} from '../services/budget.service';

export const createCategoryBudget = asyncHandler<AuthRequest>(async (req, res) => {
  const { categoryId, monthlyLimit } = req.body;
  const budget = await createBudgetService(req.user.id, { categoryId, monthlyLimit });
  return ResponseHandler.created(res, budget, 'Orçamento por categoria criado com sucesso');
});

export const getUserBudgets = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodId } = req.query as { periodId?: string };
  const budgets = await getUserBudgetsService(req.user.id, periodId);
  return ResponseHandler.success(res, budgets, 'Orçamentos por categoria recuperados com sucesso');
});

export const updateCategoryBudget = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do orçamento é obrigatório');

  const budget = await updateBudgetService(req.user.id, id, req.body);
  return ResponseHandler.success(res, budget, 'Orçamento por categoria atualizado com sucesso');
});

export const deleteCategoryBudget = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do orçamento é obrigatório');

  await deleteBudgetService(req.user.id, id);
  return ResponseHandler.success(res, null, 'Orçamento por categoria deletado com sucesso');
});
