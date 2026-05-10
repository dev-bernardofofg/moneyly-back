import { getCurrentSaoPauloDate } from "../helpers/dates";
import { calculateGoalProgress } from "../helpers/goal-progress";
import { goalRepository } from "../repositories/goal.repository";
import { financialPeriodService } from "./financial-period.service";
import { HttpError } from "../validations/errors";

import {
  validateDeleteGoal,
  validateGoal,
  validateGoalExists,
  validateUpdateGoal,
} from "../validations/goal.validation";

function monthsUntilDate(target: Date): number {
  const now = getCurrentSaoPauloDate();
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth()) +
    1;
  return Math.max(months, 0);
}

export const createGoalService = async (
  userId: string,
  data: {
    title: string;
    description?: string;
    targetAmount: number;
    targetDate: string;
  }
) => {
  const targetDate = new Date(data.targetDate);

  const [goal] = await Promise.all([
    goalRepository.create({
      userId,
      title: data.title,
      description: data.description,
      targetAmount: data.targetAmount.toString(),
      targetDate,
    }),
    financialPeriodService.createNextPeriods(userId, monthsUntilDate(targetDate)),
  ]);

  return goal;
};

export const getGoalsService = async (userId: string) => {
  const goals = await goalRepository.findByUserIdActive(userId);

  return goals.map((goal) => ({ ...goal, progress: calculateGoalProgress(goal) }));
};

export const getGoalsProgressService = async (userId: string) => {
  const goals = await getGoalsService(userId);

  const goalsWithProgress = await Promise.all(
    goals.map((goal) => goalRepository.getGoalWithMilestones(goal.id))
  );
  return goalsWithProgress;
};

export const getGoalByIdService = async (userId: string, goalId: string) => {
  const goal = await goalRepository.findByIdAndUserId(goalId, userId);
  validateGoalExists(goal);

  if (!goal) throw new HttpError(404, "Objetivo não encontrado");

  const goalWithMilestones = await goalRepository.getGoalWithMilestones(goalId);

  if (!goalWithMilestones) {
    throw new HttpError(404, "Objetivo não encontrado");
  }

  return goalWithMilestones;
};

export const updateGoalService = async (
  userId: string,
  goalId: string,
  data: {
    title?: string;
    description?: string;
    targetAmount?: number;
    targetDate?: string;
    currentAmount?: number;
    isActive?: boolean;
  }
) => {
  const goal = await goalRepository.findByIdAndUserId(goalId, userId);
  validateGoal(goal, userId);

  const updateData: Partial<{
    title: string;
    description: string | null;
    targetAmount: string;
    targetDate: Date;
    currentAmount: string;
    isActive: boolean;
  }> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.targetAmount !== undefined)
    updateData.targetAmount = data.targetAmount.toString();
  if (data.targetDate !== undefined) {
    const newTargetDate = new Date(data.targetDate);
    updateData.targetDate = newTargetDate;
    await financialPeriodService.createNextPeriods(
      userId,
      monthsUntilDate(newTargetDate)
    );
  }
  if (data.currentAmount !== undefined)
    updateData.currentAmount = data.currentAmount.toString();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updatedGoal = await goalRepository.update(goalId, updateData);

  validateUpdateGoal(updatedGoal!);

  return goalRepository.getGoalWithMilestones(goalId);
};

export const deleteGoalService = async (userId: string, goalId: string) => {
  const goal = await goalRepository.findByIdAndUserId(goalId, userId);
  validateGoal(goal, userId);

  const deleted = await goalRepository.delete(goalId);
  validateDeleteGoal(deleted);
  return deleted;
};

export const addAmountToGoalService = async (
  userId: string,
  goalId: string,
  amount: number
) => {
  const goal = await goalRepository.findByIdAndUserId(goalId, userId);
  validateGoal(goal, userId);

  const updatedGoal = await goalRepository.addAmount(goalId, amount);
  if (!updatedGoal) throw new HttpError(404, "Objetivo não encontrado");
  validateUpdateGoal(updatedGoal);

  return goalRepository.getGoalWithMilestones(goalId);
};

export const getGoalStatusService = async (userId: string) => {
  const goals = await getGoalsService(userId);
  const goalsWithProgress = await Promise.all(
    goals.map((goal) => goalRepository.getGoalWithMilestones(goal.id))
  );
  return goalsWithProgress
    .filter((goal) => goal !== null)
    .map((goal) => ({
      ...goal,
      status: calculateGoalStatus(
        goal.progress.percentage,
        goal.progress.daysRemaining
      ),
      nextMilestone: getNextMilestone(goal.milestones),
    }));
};

const calculateGoalStatus = (
  percentage: number,
  daysRemaining: number
): string => {
  if (percentage >= 100) return "completed";
  if (daysRemaining < 0) return "overdue";
  if (percentage >= 75) return "on-track";
  if (percentage >= 50) return "good-progress";
  if (percentage >= 25) return "early-stage";
  return "just-started";
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
