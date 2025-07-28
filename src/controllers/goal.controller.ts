import { Response } from "express";
import { ResponseHandler } from "../helpers/response-handler";
import { AuthenticatedRequest } from "../middlewares/auth";
import {
  addAmountToGoalService,
  createGoalService,
  deleteGoalService,
  getGoalByIdService,
  getGoalsProgressService,
  getGoalsService,
  updateGoalService,
} from "../services/goal.service";

export const createGoal = async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = req.user;

  try {
    await createGoalService(userId, req.body);

    return ResponseHandler.success(
      res,
      null,
      "Objetivo de poupança criado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Não foi possível criar o objetivo",
      error
    );
  }
};

export const getUserGoals = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId } = req.user;
  try {
    const goals = await getGoalsService(userId);

    return ResponseHandler.success(
      res,
      goals,
      "Objetivos de poupança recuperados com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Não foi possível buscar os objetivos");
  }
};

export const getGoalById = async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  try {
    const goal = await getGoalByIdService(userId, id);

    return ResponseHandler.success(
      res,
      goal,
      "Objetivo de poupança recuperado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Não foi possível buscar o objetivo");
  }
};

export const getGoalsProgress = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId } = req.user;
  try {
    const goalsProgress = await getGoalsProgressService(userId);

    return ResponseHandler.success(
      res,
      goalsProgress,
      "Progresso dos objetivos recuperado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Não foi possível buscar o progresso dos objetivos"
    );
  }
};

export const updateSavingsGoal = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  try {
    const goal = await updateGoalService(userId, id, req.body);

    return ResponseHandler.success(
      res,
      goal,
      "Objetivo de poupança atualizado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Não foi possível atualizar o objetivo");
  }
};

export const deleteSavingsGoal = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  try {
    await deleteGoalService(userId, id);

    return ResponseHandler.success(
      res,
      null,
      "Objetivo de poupança deletado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Não foi possível deletar o objetivo");
  }
};

export const addAmountToGoal = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId } = req.user;
  const { id } = req.params;
  const { amount } = req.body;

  try {
    const goal = await addAmountToGoalService(userId, id, amount);

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
