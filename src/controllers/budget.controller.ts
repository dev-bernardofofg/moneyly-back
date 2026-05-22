import type { NextFunction, Response } from 'express';
import { isHttpError } from '../helpers/errors';
import { ResponseHandler } from '../helpers/response-handler';
import type { AuthenticatedRequest } from '../middlewares/auth';
import {
  createBudgetService,
  deleteBudgetService,
  getUserBudgetsService,
  updateBudgetService,
} from '../services/budget.service';

export const createCategoryBudget = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  try {
    const { categoryId, monthlyLimit } = req.body;
    const budget = await createBudgetService(req.user.id, { categoryId, monthlyLimit });
    return ResponseHandler.created(res, budget, 'Orçamento por categoria criado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao criar orçamento por categoria', error);
  }
};

export const getUserBudgets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { periodId } = req.query as { periodId?: string };

  try {
    const budgets = await getUserBudgetsService(req.user.id, periodId);
    return ResponseHandler.success(
      res,
      budgets,
      'Orçamentos por categoria recuperados com sucesso'
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao buscar orçamentos por categoria', error);
  }
};

export const updateCategoryBudget = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID do orçamento é obrigatório');

  try {
    const budget = await updateBudgetService(req.user.id, id, req.body);
    return ResponseHandler.success(res, budget, 'Orçamento por categoria atualizado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao atualizar orçamento por categoria', error);
  }
};

export const deleteCategoryBudget = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID do orçamento é obrigatório');

  try {
    await deleteBudgetService(req.user.id, id);
    return ResponseHandler.success(res, null, 'Orçamento por categoria deletado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao deletar orçamento por categoria', error);
  }
};
