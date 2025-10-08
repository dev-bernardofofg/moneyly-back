import { GoalRepository } from "../repositories/goal.repository";
import { HttpError } from "../validations/errors";
import {
  validateDeleteGoal,
  validateGoal,
  validateGoalExists,
  validateUpdateGoal,
} from "../validations/goal.validation";

export const createGoalService = async (
  userId: string,
  data: {
    title: string;
    description?: string;
    targetAmount: number;
    targetDate: string;
  }
) => {
  const goal = await GoalRepository.create({
    userId,
    title: data.title,
    description: data.description,
    targetAmount: data.targetAmount.toString(),
    targetDate: new Date(data.targetDate),
  });

  return goal;
};

export const getGoalsService = async (userId: string) => {
  const goals = await GoalRepository.findByUserIdActive(userId);

  // Adicionar progress para cada goal
  const goalsWithProgress = goals.map((goal) => {
    const targetAmount = Number(goal.targetAmount);
    const currentAmount = Number(goal.currentAmount);
    const percentage =
      targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;

    const now = new Date();
    const targetDate = new Date(goal.targetDate);
    const daysRemaining = Math.ceil(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      ...goal,
      progress: {
        percentage,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      },
    };
  });

  return goalsWithProgress;
};

export const getGoalsProgressService = async (userId: string) => {
  const goals = await getGoalsService(userId);

  const goalsWithProgress = await Promise.all(
    goals.map((goal) => GoalRepository.getGoalWithMilestones(goal.id))
  );
  return goalsWithProgress;
};

export const getGoalByIdService = async (userId: string, goalId: string) => {
  const goal = await GoalRepository.findByIdAndUserId(goalId, userId);
  validateGoalExists(goal);

  if (!goal) {
    throw new Error("Goal não encontrado"); // Never reached due to validateGoalExists
  }

  // Buscar milestones e adicionar progress
  const goalWithMilestones = await GoalRepository.getGoalWithMilestones(goalId);

  if (!goalWithMilestones) {
    throw new HttpError(404, "Objetivo não encontrado");
  }

  const targetAmount = Number(goalWithMilestones.targetAmount);
  const currentAmount = Number(goalWithMilestones.currentAmount);
  const percentage =
    targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;

  const now = new Date();
  const targetDate = new Date(goalWithMilestones.targetDate);
  const daysRemaining = Math.ceil(
    (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    ...goalWithMilestones,
    progress: {
      percentage,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
    },
  };
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
  const goal = await GoalRepository.findByIdAndUserId(goalId, userId);
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
  if (data.targetDate !== undefined)
    updateData.targetDate = new Date(data.targetDate);
  if (data.currentAmount !== undefined)
    updateData.currentAmount = data.currentAmount.toString();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updatedGoal = await GoalRepository.update(goalId, updateData);

  validateUpdateGoal(updatedGoal!);

  return GoalRepository.getGoalWithMilestones(goalId);
};

export const deleteGoalService = async (userId: string, goalId: string) => {
  const goal = await GoalRepository.findByIdAndUserId(goalId, userId);
  validateGoal(goal, userId);

  const deleted = await GoalRepository.delete(goalId);
  validateDeleteGoal(deleted);
  return deleted;
};

export const addAmountToGoalService = async (
  userId: string,
  goalId: string,
  amount: number
) => {
  const goal = await GoalRepository.findByIdAndUserId(goalId, userId);
  validateGoal(goal!, userId);

  const updatedGoal = await GoalRepository.addAmount(goalId, amount);
  validateUpdateGoal(updatedGoal!);

  return GoalRepository.getGoalWithMilestones(goalId);
};

export const getGoalStatusService = async (userId: string) => {
  const goals = await getGoalsService(userId);
  const goalsWithProgress = await Promise.all(
    goals.map((goal) => GoalRepository.getGoalWithMilestones(goal.id))
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
