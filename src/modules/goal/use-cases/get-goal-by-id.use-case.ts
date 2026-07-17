import { HttpError } from '../../../core/errors/http-error';
import { goalRepository } from '../repositories/goal.repository';
import { validateGoalExists } from '../validations/goal.validation';

export const getGoalByIdUseCase = async (userId: string, goalId: string) => {
  const goal = await goalRepository.findByIdAndUserId(goalId, userId);
  validateGoalExists(goal);

  if (!goal) throw new HttpError(404, 'Objetivo não encontrado');

  const goalWithMilestones = await goalRepository.getGoalWithMilestones(goalId);

  if (!goalWithMilestones) {
    throw new HttpError(404, 'Objetivo não encontrado');
  }

  return goalWithMilestones;
};
