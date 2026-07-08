import { getCurrentSaoPauloDate } from '../helpers/dates';
import { calculateGoalProgress } from '../helpers/goal-progress';
import { goalRepository } from '../repositories/goal.repository';
import type { IGoalRepository } from '../repositories/interfaces/IGoalRepository';
import { financialPeriodService } from './financial-period.service';
import { NotFoundError } from './errors';

import {
  validateDeleteGoal,
  validateGoal,
  validateGoalExists,
  validateUpdateGoal,
} from '../validations/goal.validation';

export interface GoalServiceDeps {
  goalRepository: Pick<
    IGoalRepository,
    | 'create'
    | 'findByUserIdActive'
    | 'findByIdAndUserId'
    | 'update'
    | 'delete'
    | 'addAmount'
    | 'getGoalWithMilestones'
  >;
  financialPeriodService: Pick<typeof financialPeriodService, 'createNextPeriods'>;
  validations: {
    validateGoal: typeof validateGoal;
    validateGoalExists: typeof validateGoalExists;
    validateUpdateGoal: typeof validateUpdateGoal;
    validateDeleteGoal: typeof validateDeleteGoal;
  };
}

function monthsUntilDate(target: Date): number {
  const now = getCurrentSaoPauloDate();
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()) + 1;
  return Math.max(months, 0);
}

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

export const makeGoalService = (deps: GoalServiceDeps) => {
  const { goalRepository, financialPeriodService, validations } = deps;

  const create = async (
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

  const getGoals = async (userId: string) => {
    const goals = await goalRepository.findByUserIdActive(userId);

    return goals.map((goal) => ({ ...goal, progress: calculateGoalProgress(goal) }));
  };

  const getProgress = async (userId: string) => {
    const goals = await getGoals(userId);

    return Promise.all(goals.map((goal) => goalRepository.getGoalWithMilestones(goal.id)));
  };

  const getById = async (userId: string, goalId: string) => {
    const goal = await goalRepository.findByIdAndUserId(goalId, userId);
    validations.validateGoalExists(goal);

    if (!goal) throw new NotFoundError('Objetivo não encontrado');

    const goalWithMilestones = await goalRepository.getGoalWithMilestones(goalId);

    if (!goalWithMilestones) {
      throw new NotFoundError('Objetivo não encontrado');
    }

    return goalWithMilestones;
  };

  const update = async (
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
    validations.validateGoal(goal, userId);

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
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount.toString();
    if (data.targetDate !== undefined) {
      const newTargetDate = new Date(data.targetDate);
      updateData.targetDate = newTargetDate;
      await financialPeriodService.createNextPeriods(userId, monthsUntilDate(newTargetDate));
    }
    if (data.currentAmount !== undefined) updateData.currentAmount = data.currentAmount.toString();
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedGoal = await goalRepository.update(goalId, updateData);

    validations.validateUpdateGoal(updatedGoal!);

    return goalRepository.getGoalWithMilestones(goalId);
  };

  const remove = async (userId: string, goalId: string) => {
    const goal = await goalRepository.findByIdAndUserId(goalId, userId);
    validations.validateGoal(goal, userId);

    const deleted = await goalRepository.delete(goalId);
    validations.validateDeleteGoal(deleted);
    return deleted;
  };

  const addAmount = async (userId: string, goalId: string, amount: number) => {
    const goal = await goalRepository.findByIdAndUserId(goalId, userId);
    validations.validateGoal(goal, userId);

    const updatedGoal = await goalRepository.addAmount(goalId, amount);
    if (!updatedGoal) throw new NotFoundError('Objetivo não encontrado');
    validations.validateUpdateGoal(updatedGoal);

    return goalRepository.getGoalWithMilestones(goalId);
  };

  const getStatus = async (userId: string) => {
    const goals = await getGoals(userId);
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

  return {
    create,
    getGoals,
    getProgress,
    getById,
    update,
    delete: remove,
    addAmount,
    getStatus,
  };
};

// Composition root: instância default com os singletons reais.
export const goalService = makeGoalService({
  goalRepository,
  financialPeriodService,
  validations: {
    validateGoal,
    validateGoalExists,
    validateUpdateGoal,
    validateDeleteGoal,
  },
});
