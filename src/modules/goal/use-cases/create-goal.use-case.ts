import { financialPeriodService } from '@modules/financial-period';
import { monthsUntilDate } from '../helpers/months-until-date';
import { goalRepository } from '../repositories/goal.repository';

export const createGoalUseCase = async (
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
