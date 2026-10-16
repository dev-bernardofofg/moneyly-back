import { getBudgetProgressUseCase } from '@modules/budget';
import { getGoalsProgressUseCase } from '@modules/goal';
import { calculateAlerts, calculatePlanningStats } from '../helpers/planner-calcs';
import { toMoney } from '../helpers/free-balance';
import { getForecastUseCase } from './get-forecast.use-case';

export const getPlannerOverviewUseCase = async (
  userId: string,
  monthlyIncome: number,
  periodId?: string
) => {
  // Reservas vêm do forecast: planner e Saldo Livre nunca divergem no mesmo período.
  const forecast = await getForecastUseCase(userId, periodId);

  const [budgetProgress, goalsProgress] = await Promise.all([
    getBudgetProgressUseCase(userId, forecast.period.id),
    getGoalsProgressUseCase(userId),
  ]);
  const stats = calculatePlanningStats(budgetProgress, goalsProgress, monthlyIncome);
  const alerts = calculateAlerts(stats, monthlyIncome, budgetProgress, goalsProgress);
  const { budgets, goals } = forecast.freeBalance.reserves;

  return {
    stats,
    alerts,
    period: forecast.period,
    freeBalanceImpact: {
      budgetReserve: budgets,
      goalReserve: goals,
      total: toMoney(budgets + goals),
    },
  };
};
