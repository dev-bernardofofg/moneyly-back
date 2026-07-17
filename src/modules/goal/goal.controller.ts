import { ResponseHandler } from '../../core/helpers/response-handler';
import { asyncHandler } from '../../core/middlewares/async-handler';
import type { AuthRequest } from '../auth/middlewares/auth';
import { BadRequestError } from '../../core/errors';
import { addAmountToGoalUseCase } from './use-cases/add-amount-to-goal.use-case';
import { createGoalUseCase } from './use-cases/create-goal.use-case';
import { deleteGoalUseCase } from './use-cases/delete-goal.use-case';
import { getGoalByIdUseCase } from './use-cases/get-goal-by-id.use-case';
import { getGoalsProgressUseCase } from './use-cases/get-goals-progress.use-case';
import { listGoalsUseCase } from './use-cases/list-goals.use-case';
import { updateGoalUseCase } from './use-cases/update-goal.use-case';

export const createGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const goal = await createGoalUseCase(req.user.id, req.body);
  return ResponseHandler.created(res, goal, 'Objetivo de poupança criado com sucesso');
});

export const getUserGoals = asyncHandler<AuthRequest>(async (req, res) => {
  const goals = await listGoalsUseCase(req.user.id);
  return ResponseHandler.success(res, goals, 'Objetivos de poupança recuperados com sucesso');
});

export const getGoalById = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  const goal = await getGoalByIdUseCase(req.user.id, id);
  return ResponseHandler.success(res, goal, 'Objetivo de poupança recuperado com sucesso');
});

export const getGoalsProgress = asyncHandler<AuthRequest>(async (req, res) => {
  const goalsProgress = await getGoalsProgressUseCase(req.user.id);
  return ResponseHandler.success(
    res,
    goalsProgress,
    'Progresso dos objetivos recuperado com sucesso'
  );
});

export const updateSavingsGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  const goal = await updateGoalUseCase(req.user.id, id, req.body);
  return ResponseHandler.success(res, goal, 'Objetivo de poupança atualizado com sucesso');
});

export const deleteSavingsGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  await deleteGoalUseCase(req.user.id, id);
  return ResponseHandler.success(res, null, 'Objetivo de poupança deletado com sucesso');
});

export const addAmountToGoal = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do objetivo não fornecido');

  const { amount } = req.body;
  const goal = await addAmountToGoalUseCase(req.user.id, id, amount);
  return ResponseHandler.success(res, goal, 'Valor adicionado ao objetivo com sucesso');
});
