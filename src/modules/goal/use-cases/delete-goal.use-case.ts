import { goalRepository } from '../repositories/goal.repository';
import { validateDeleteGoal, validateGoal } from '../validations/goal.validation';

export const deleteGoalUseCase = async (userId: string, goalId: string) => {
  const goal = await goalRepository.findByIdAndUserId(goalId, userId);
  validateGoal(goal, userId);

  const deleted = await goalRepository.delete(goalId);
  validateDeleteGoal(deleted);
  return deleted;
};
