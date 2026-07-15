import { calculateGoalProgress } from '../helpers/goal-progress';
import { goalRepository } from '../repositories/goal.repository';

export const listGoalsUseCase = async (userId: string) => {
  const goals = await goalRepository.findByUserIdActive(userId);

  return goals.map((goal) => ({ ...goal, progress: calculateGoalProgress(goal) }));
};
