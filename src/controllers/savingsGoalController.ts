import { Response } from "express";
import { ResponseHandler } from "../lib/ResponseHandler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { SavingsGoalService } from "../services/savingsGoalService";

export const createSavingsGoal = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const goalService = new SavingsGoalService();
    await goalService.createGoal(req.userId, req.body);

    return ResponseHandler.success(
      res,
      null,
      "Objetivo de poupança criado com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao criar objetivo de poupança:", error);
    return ResponseHandler.error(res, error.message);
  }
};

export const getUserGoals = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { activeOnly } = req.query;
    const goalService = new SavingsGoalService();

    const goals = await goalService.getUserGoals(
      req.userId,
      activeOnly !== "false"
    );

    return ResponseHandler.success(
      res,
      goals,
      "Objetivos de poupança recuperados com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao buscar objetivos de poupança:", error);
    return ResponseHandler.serverError(res);
  }
};

export const getGoalById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { id } = req.params;
    const goalService = new SavingsGoalService();

    const goal = await goalService.getGoalById(req.userId, id);

    return ResponseHandler.success(
      res,
      goal,
      "Objetivo de poupança recuperado com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao buscar objetivo de poupança:", error);
    return ResponseHandler.error(res, error.message);
  }
};

export const getGoalsProgress = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const goalService = new SavingsGoalService();
    const goalsProgress = await goalService.getGoalsProgress(req.userId);

    return ResponseHandler.success(
      res,
      goalsProgress,
      "Progresso dos objetivos recuperado com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao buscar progresso dos objetivos:", error);
    return ResponseHandler.serverError(res);
  }
};

export const updateSavingsGoal = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { id } = req.params;
    const goalService = new SavingsGoalService();

    const goal = await goalService.updateGoal(req.userId, id, req.body);

    return ResponseHandler.success(
      res,
      goal,
      "Objetivo de poupança atualizado com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao atualizar objetivo de poupança:", error);
    return ResponseHandler.error(res, error.message);
  }
};

export const deleteSavingsGoal = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { id } = req.params;
    const goalService = new SavingsGoalService();

    const deleted = await goalService.deleteGoal(req.userId, id);

    if (!deleted) {
      return ResponseHandler.notFound(res, "Objetivo não encontrado");
    }

    return ResponseHandler.success(
      res,
      null,
      "Objetivo de poupança deletado com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao deletar objetivo de poupança:", error);
    return ResponseHandler.error(res, error.message);
  }
};

export const addAmountToGoal = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { id } = req.params;
    const { amount } = req.body;
    const goalService = new SavingsGoalService();

    const goal = await goalService.addAmountToGoal(req.userId, id, amount);

    return ResponseHandler.success(
      res,
      goal,
      "Valor adicionado ao objetivo com sucesso"
    );
  } catch (error: any) {
    console.error("Erro ao adicionar valor ao objetivo:", error);
    return ResponseHandler.error(res, error.message);
  }
};
