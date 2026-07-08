import { ResponseHandler } from '../helpers/response-handler';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import { BadRequestError } from '../services/errors';
import { goalService } from '../services/goal.service';

export const createGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const goal = await goalService.create(req.user.id, req.body);
  return ResponseHandler.created(res, goal, 'Objetivo de poupança criado com sucesso');
});

export const getUserGoals = asyncHandler<AuthRequest>(async (req, res) => {
  const goals = await goalService.getGoals(req.user.id);
  return ResponseHandler.success(res, goals, 'Objetivos de poupança recuperados com sucesso');
});

export const getGoalById = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  const goal = await goalService.getById(req.user.id, id);
  return ResponseHandler.success(res, goal, 'Objetivo de poupança recuperado com sucesso');
});

export const getGoalsProgress = asyncHandler<AuthRequest>(async (req, res) => {
  const goalsProgress = await goalService.getProgress(req.user.id);
  return ResponseHandler.success(
    res,
    goalsProgress,
    'Progresso dos objetivos recuperado com sucesso'
  );
});

export const updateSavingsGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  const goal = await goalService.update(req.user.id, id, req.body);
  return ResponseHandler.success(res, goal, 'Objetivo de poupança atualizado com sucesso');
});

export const deleteSavingsGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  await goalService.delete(req.user.id, id);
  return ResponseHandler.success(res, null, 'Objetivo de poupança deletado com sucesso');
});

export const addAmountToGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  const { amount } = req.body;
  const goal = await goalService.addAmount(req.user.id, id, amount);
  return ResponseHandler.success(res, goal, 'Valor adicionado ao objetivo com sucesso');
});
