import type { Goal } from '../db/schema';

export type GoalProgress = {
  percentage: number;
  remaining: number;
  daysRemaining: number;
};

export function calculateGoalProgress(
  goal: Pick<Goal, 'targetAmount' | 'currentAmount' | 'targetDate'>
): GoalProgress {
  const targetAmount = Number(goal.targetAmount);
  const currentAmount = Number(goal.currentAmount ?? 0);
  const percentage = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;
  const remaining = Math.max(0, targetAmount - currentAmount);
  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return { percentage, remaining, daysRemaining };
}
