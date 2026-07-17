import { ResponseHandler } from '../../core/helpers/response-handler';
import { asyncHandler } from '../../core/middlewares/async-handler';
import type { AuthRequest } from '../auth/middlewares/auth';
import { BadRequestError } from '../../core/errors';
import { createBudgetUseCase } from './use-cases/create-budget.use-case';
import { deleteBudgetUseCase } from './use-cases/delete-budget.use-case';
import { listBudgetsUseCase } from './use-cases/list-budgets.use-case';
import { updateBudgetUseCase } from './use-cases/update-budget.use-case';

export const createCategoryBudget = asyncHandler<AuthRequest>(async (req, res) => {
  const { categoryId, monthlyLimit } = req.body;
  const budget = await createBudgetUseCase(req.user.id, { categoryId, monthlyLimit });
  return ResponseHandler.created(res, budget, 'Orçamento por categoria criado com sucesso');
});

export const getUserBudgets = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodId } = req.query as { periodId?: string };
  const budgets = await listBudgetsUseCase(req.user.id, periodId);
  return ResponseHandler.success(res, budgets, 'Orçamentos por categoria recuperados com sucesso');
});

export const updateCategoryBudget = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do orçamento é obrigatório');

  const budget = await updateBudgetUseCase(req.user.id, id, req.body);
  return ResponseHandler.success(res, budget, 'Orçamento por categoria atualizado com sucesso');
});

export const deleteCategoryBudget = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do orçamento é obrigatório');

  await deleteBudgetUseCase(req.user.id, id);
  return ResponseHandler.success(res, null, 'Orçamento por categoria deletado com sucesso');
});
