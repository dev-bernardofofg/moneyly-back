import { ResponseHandler } from '../helpers/response-handler';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import { BadRequestError } from '../services/errors';
import {
  addAmountToGoalService,
  createGoalService,
  deleteGoalService,
  getGoalByIdService,
  getGoalsProgressService,
  getGoalsService,
  updateGoalService,
} from '../services/goal.service';

export const createGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const goal = await createGoalService(req.user.id, req.body);
  return ResponseHandler.created(res, goal, 'Objetivo de poupança criado com sucesso');
});

export const getUserGoals = asyncHandler<AuthRequest>(async (req, res) => {
  const goals = await getGoalsService(req.user.id);
  return ResponseHandler.success(res, goals, 'Objetivos de poupança recuperados com sucesso');
});

export const getGoalById = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  const goal = await getGoalByIdService(req.user.id, id);
  return ResponseHandler.success(res, goal, 'Objetivo de poupança recuperado com sucesso');
});

export const getGoalsProgress = asyncHandler<AuthRequest>(async (req, res) => {
  const goalsProgress = await getGoalsProgressService(req.user.id);
  return ResponseHandler.success(
    res,
    goalsProgress,
    'Progresso dos objetivos recuperado com sucesso'
  );
});

export const updateSavingsGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  const goal = await updateGoalService(req.user.id, id, req.body);
  return ResponseHandler.success(res, goal, 'Objetivo de poupança atualizado com sucesso');
});

export const deleteSavingsGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  await deleteGoalService(req.user.id, id);
  return ResponseHandler.success(res, null, 'Objetivo de poupança deletado com sucesso');
});

export const addAmountToGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  const { amount } = req.body;
  const goal = await addAmountToGoalService(req.user.id, id, amount);
  return ResponseHandler.success(res, goal, 'Valor adicionado ao objetivo com sucesso');
});
