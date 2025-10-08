import { Response } from "express";
import { ResponseHandler } from "../helpers/response-handler";
import { AuthenticatedRequest } from "../middlewares/auth";
import {
  createBudgetService,
  deleteBudgetService,
  getUserBudgetsService,
  updateBudgetService,
} from "../services/budget.service";

export const createCategoryBudget = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { categoryId, monthlyLimit } = req.body;
    const { userId } = req;

    if (!userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const budget = await createBudgetService(userId, {
      categoryId,
      monthlyLimit,
    });

    return ResponseHandler.created(
      res,
      budget,
      "Orçamento por categoria criado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao criar orçamento por categoria",
      error
    );
  }
};

export const getUserBudgets = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { userId } = req;

  if (!userId) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  try {
    const budgets = await getUserBudgetsService(userId);

    return ResponseHandler.success(
      res,
      budgets,
      "Orçamentos por categoria recuperados com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao buscar orçamentos por categoria",
      error
    );
  }
};

export const updateCategoryBudget = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { userId } = req;
  const { id } = req.params;

  if (!userId) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  if (!id) {
    return ResponseHandler.error(res, "ID do orçamento é obrigatório");
  }

  try {
    const budget = await updateBudgetService(userId, id, req.body);

    return ResponseHandler.success(
      res,
      budget,
      "Orçamento por categoria atualizado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao atualizar orçamento por categoria",
      error
    );
  }
};

export const deleteCategoryBudget = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { userId } = req;
  const { id } = req.params;

  if (!userId) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  if (!id) {
    return ResponseHandler.error(res, "ID do orçamento é obrigatório");
  }

  try {
    await deleteBudgetService(userId, id);

    return ResponseHandler.success(
      res,
      null,
      "Orçamento por categoria deletado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao deletar orçamento por categoria",
      error
    );
  }
};
