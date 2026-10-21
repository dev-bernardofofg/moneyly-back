import { financialPeriodService } from '@modules/financial-period';
import { monthsUntilDate } from '../helpers/months-until-date';
import { goalRepository } from '../repositories/goal.repository';
import { validateGoal, validateUpdateGoal } from '../validations/goal.validation';

export const updateGoalUseCase = async (
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
    targetAmount: number;
    targetDate: Date;
    currentAmount: number;
    isActive: boolean;
  }> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
  if (data.targetDate !== undefined) {
    const newTargetDate = new Date(data.targetDate);
    updateData.targetDate = newTargetDate;
    await financialPeriodService.createNextPeriods(userId, monthsUntilDate(newTargetDate));
  }
  if (data.currentAmount !== undefined) updateData.currentAmount = data.currentAmount;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updatedGoal = await goalRepository.update(goalId, updateData);

  validateUpdateGoal(updatedGoal!);

  return goalRepository.getGoalWithMilestones(goalId);
};
