import { logger } from '../../../core/lib/logger';
import { HttpError } from '../../../validations/errors';
import { notifyGoalMilestones } from '../../notification';
import { goalRepository } from '../repositories/goal.repository';
import { validateGoal, validateUpdateGoal } from '../validations/goal.validation';

export const addAmountToGoalUseCase = async (userId: string, goalId: string, amount: number) => {
  const goal = await goalRepository.findByIdAndUserId(goalId, userId);
  validateGoal(goal, userId);

  const milestonesBefore = await goalRepository.findMilestonesByGoalId(goalId);

  const updatedGoal = await goalRepository.addAmount(goalId, amount);
  if (!updatedGoal) throw new HttpError(404, 'Objetivo não encontrado');
  validateUpdateGoal(updatedGoal);

  const result = await goalRepository.getGoalWithMilestones(goalId);

  if (result) {
    const reachedBefore = new Set(milestonesBefore.filter((m) => m.isReached).map((m) => m.id));
    const newlyReached = result.milestones.filter((m) => m.isReached && !reachedBefore.has(m.id));

    if (newlyReached.length > 0) {
      try {
        await notifyGoalMilestones(userId, updatedGoal, newlyReached);
      } catch (error) {
        // Falha de notificação nunca quebra o add-amount.
        logger.error('[goals] milestone notification failed', error as Error);
      }
    }
  }

  return result;
};
