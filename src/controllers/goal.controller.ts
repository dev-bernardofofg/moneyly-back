import type { NextFunction, Response } from 'express';
import { isHttpError } from '../helpers/errors';
import { ResponseHandler } from '../helpers/response-handler';
import type { AuthenticatedRequest } from '../middlewares/auth';
import {
  addAmountToGoalService,
  createGoalService,
  deleteGoalService,
  getGoalByIdService,
  getGoalsProgressService,
  getGoalsService,
  updateGoalService,
} from '../services/goal.service';

export const createGoal = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  try {
    const goal = await createGoalService(req.user.id, req.body);
    return ResponseHandler.created(res, goal, 'Objetivo de poupança criado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível criar o objetivo', error);
  }
};

export const getUserGoals = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  try {
    const goals = await getGoalsService(req.user.id);
    return ResponseHandler.success(res, goals, 'Objetivos de poupança recuperados com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível buscar os objetivos', error);
  }
};

export const getGoalById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID do objetivo não fornecido');

  try {
    const goal = await getGoalByIdService(req.user.id, id);
    return ResponseHandler.success(res, goal, 'Objetivo de poupança recuperado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível buscar o objetivo', error);
  }
};

export const getGoalsProgress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  try {
    const goalsProgress = await getGoalsProgressService(req.user.id);
    return ResponseHandler.success(
      res,
      goalsProgress,
      'Progresso dos objetivos recuperado com sucesso'
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível buscar o progresso dos objetivos', error);
  }
};

export const updateSavingsGoal = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID do objetivo não fornecido');

  try {
    const goal = await updateGoalService(req.user.id, id, req.body);
    return ResponseHandler.success(res, goal, 'Objetivo de poupança atualizado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível atualizar o objetivo', error);
  }
};

export const deleteSavingsGoal = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID do objetivo não fornecido');

  try {
    await deleteGoalService(req.user.id, id);
    return ResponseHandler.success(res, null, 'Objetivo de poupança deletado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível deletar o objetivo', error);
  }
};

export const addAmountToGoal = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID do objetivo não fornecido');

  try {
    const { amount } = req.body;
    const goal = await addAmountToGoalService(req.user.id, id, amount);
    return ResponseHandler.success(res, goal, 'Valor adicionado ao objetivo com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível adicionar valor ao objetivo', error);
  }
};
