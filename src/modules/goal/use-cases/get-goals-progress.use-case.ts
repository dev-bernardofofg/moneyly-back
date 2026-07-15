import { goalRepository } from '../repositories/goal.repository';
import { listGoalsUseCase } from './list-goals.use-case';

export const getGoalsProgressUseCase = async (userId: string) => {
  const goals = await listGoalsUseCase(userId);

  const goalsWithProgress = await Promise.all(
    goals.map((goal) => goalRepository.getGoalWithMilestones(goal.id))
  );
  return goalsWithProgress;
};
