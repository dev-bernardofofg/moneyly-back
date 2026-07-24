import { goalRepository } from '../repositories/goal.repository';
import { listGoalsUseCase } from './list-goals.use-case';

export const getGoalStatusUseCase = async (userId: string) => {
  const goals = await listGoalsUseCase(userId);
  const goalsWithProgress = await Promise.all(
    goals.map((goal) => goalRepository.getGoalWithMilestones(goal.id))
  );
  return goalsWithProgress
    .filter((goal) => goal !== null)
    .map((goal) => ({
      ...goal,
      status: calculateGoalStatus(goal.progress.percentage, goal.progress.daysRemaining),
      nextMilestone: getNextMilestone(goal.milestones),
    }));
};

const calculateGoalStatus = (percentage: number, daysRemaining: number): string => {
  if (percentage >= 100) return 'completed';
  if (daysRemaining < 0) return 'overdue';
  if (percentage >= 75) return 'on-track';
  if (percentage >= 50) return 'good-progress';
  if (percentage >= 25) return 'early-stage';
  return 'just-started';
};

const getNextMilestone = (
  milestones: Array<{
    id: string;
    percentage: number;
    amount: string;
    isReached: boolean | null;
  }>
):
  | {
      id: string;
      percentage: number;
      amount: string;
      isReached: boolean | null;
    }
  | undefined => {
  const unreachedMilestones = milestones.filter((m) => !m.isReached);
  return unreachedMilestones[0];
};
