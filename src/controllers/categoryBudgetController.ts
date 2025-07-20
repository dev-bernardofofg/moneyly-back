import { Response } from "express";
import { ResponseHandler } from "../lib/ResponseHandler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { CategoryBudgetService } from "../services/categoryBudgetService";

export const createCategoryBudget = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const budgetService = new CategoryBudgetService();
    await budgetService.createBudget(req.userId, req.body);

    return ResponseHandler.success(
      res,
      null,
      "Orçamento por categoria criado com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao criar orçamento por categoria:", error);
    return ResponseHandler.error(res, error.message);
  }
};

export const getUserBudgets = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const budgetService = new CategoryBudgetService();

    const budgets = await budgetService.getUserBudgets(req.userId);

    return ResponseHandler.success(
      res,
      budgets,
      "Orçamentos por categoria recuperados com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao buscar orçamentos por categoria:", error);
    return ResponseHandler.serverError(res);
  }
};

export const getBudgetProgress = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const budgetService = new CategoryBudgetService();

    const budgetProgress = await budgetService.getBudgetProgress(req.userId);

    return ResponseHandler.success(
      res,
      budgetProgress,
      "Progresso dos orçamentos recuperado com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao buscar progresso dos orçamentos:", error);
    return ResponseHandler.serverError(res);
  }
};

export const updateCategoryBudget = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { id } = req.params;
    const budgetService = new CategoryBudgetService();

    const budget = await budgetService.updateBudget(req.userId, id, req.body);

    return ResponseHandler.success(
      res,
      budget,
      "Orçamento por categoria atualizado com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao atualizar orçamento por categoria:", error);
    return ResponseHandler.error(res, error.message);
  }
};

export const deleteCategoryBudget = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { id } = req.params;
    const budgetService = new CategoryBudgetService();

    const deleted = await budgetService.deleteBudget(req.userId, id);

    if (!deleted) {
      return ResponseHandler.notFound(res, "Orçamento não encontrado");
    }

    return ResponseHandler.success(
      res,
      null,
      "Orçamento por categoria deletado com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao deletar orçamento por categoria:", error);
    return ResponseHandler.error(res, error.message);
  }
};
