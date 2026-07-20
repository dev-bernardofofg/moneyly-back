import { getBudgetProgressUseCase } from '@modules/budget';
import { getGoalsProgressUseCase } from '@modules/goal';
import { calculateAlerts, calculatePlanningStats } from '../helpers/planner-calcs';

export const getPlannerOverviewUseCase = async (userId: string, monthlyIncome: number) => {
  const budgetProgress = await getBudgetProgressUseCase(userId);
  const goalsProgress = await getGoalsProgressUseCase(userId);
  const stats = calculatePlanningStats(budgetProgress, goalsProgress, monthlyIncome);
  const alerts = calculateAlerts(stats, monthlyIncome, budgetProgress, goalsProgress);

  return {
    stats,
    alerts,
  };
};
