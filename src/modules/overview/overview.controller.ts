import { formatBrazilianDate } from '@core/helpers/dates';
import { getCurrentFinancialPeriod } from '@modules/financial-period';
import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import type { AuthRequest } from '@modules/auth/middlewares/auth';
import type { GetDashboardOverviewQuery } from './schemas/overview.schema';
import { getAvailablePeriodsUseCase } from './use-cases/get-available-periods.use-case';
import { getComparativeInsightsUseCase } from './use-cases/get-comparative-insights.use-case';
import { getDashboardOverviewUseCase } from './use-cases/get-dashboard-overview.use-case';
import { getDashboardPreviewsUseCase } from './use-cases/get-dashboard-previews.use-case';
import { getFinancialInsightsUseCase } from './use-cases/get-financial-insights.use-case';
import { getForecastUseCase } from './use-cases/get-forecast.use-case';
import { getPeriodTransactionsUseCase } from './use-cases/get-period-transactions.use-case';
import { getPlannerOverviewUseCase } from './use-cases/get-planner-overview.use-case';

export const getDashboardOverview = asyncHandler<
  AuthRequest & { query: GetDashboardOverviewQuery }
>(async (req, res) => {
  const { user } = req;
  const { periodId } = req.query;
  const { id: userId, financialDayStart, financialDayEnd, monthlyIncome } = user;

  const { transactions, availablePeriods, selectedPeriod } = await getPeriodTransactionsUseCase(
    userId,
    { startDay: financialDayStart ?? 1, endDay: financialDayEnd ?? 31 },
    periodId
  );

  const { stats, chart, recentTransactions } = await getDashboardOverviewUseCase(
    Number(monthlyIncome) || 0,
    transactions
  );

  const previews = await getDashboardPreviewsUseCase(
    userId,
    financialDayStart ?? 1,
    financialDayEnd ?? 31
  );

  return ResponseHandler.success(
    res,
    {
      stats,
      previews,
      selectedPeriod: selectedPeriod
        ? {
            id: selectedPeriod.id,
            startDate: selectedPeriod.startDate,
            endDate: selectedPeriod.endDate,
            label: selectedPeriod.label,
            transactionCount: selectedPeriod.transactionCount,
            description: `Período financeiro: ${formatBrazilianDate(
              selectedPeriod.startDate
            )} a ${formatBrazilianDate(selectedPeriod.endDate)}`,
          }
        : null,
      availablePeriods,
      chart,
      recentTransactions,
      transactionsCount: transactions.length,
    },
    'Dados do dashboard recuperados com sucesso'
  );
});

export const getAvailablePeriods = asyncHandler<AuthRequest>(async (req, res) => {
  const availablePeriods = await getAvailablePeriodsUseCase(req.user.id);
  return ResponseHandler.success(
    res,
    availablePeriods,
    'Períodos financeiros disponíveis recuperados com sucesso'
  );
});

export const getFinancialInsights = asyncHandler<AuthRequest>(async (req, res) => {
  const insights = await getFinancialInsightsUseCase(
    req.user.id,
    Number(req.user.monthlyIncome) || 0
  );
  return ResponseHandler.success(res, insights, 'Insights financeiros gerados com sucesso');
});

export const getForecast = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodId } = req.query as { periodId?: string };
  const forecast = await getForecastUseCase(req.user.id, periodId);
  return ResponseHandler.success(res, forecast, 'Projeção de saldo gerada com sucesso');
});

export const getComparativeInsights = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodsBack } = req.query as { periodsBack?: number };
  const data = await getComparativeInsightsUseCase(req.user.id, periodsBack);
  return ResponseHandler.success(res, data, 'Insights comparativos gerados com sucesso');
});

export const getPlannerOverview = asyncHandler<AuthRequest>(async (req, res) => {
  const { id: userId, financialDayStart, financialDayEnd, monthlyIncome } = req.user;

  const currentPeriod = getCurrentFinancialPeriod(financialDayStart ?? 1, financialDayEnd ?? 31);

  const { stats, alerts } = await getPlannerOverviewUseCase(userId, Number(monthlyIncome) || 0);

  return ResponseHandler.success(
    res,
    {
      stats,
      currentPeriod: {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        description: `Período financeiro: ${currentPeriod.startDate.toLocaleDateString(
          'pt-BR'
        )} a ${currentPeriod.endDate.toLocaleDateString('pt-BR')}`,
      },
      alerts,
    },
    'Stats do planejamento recuperados com sucesso'
  );
});
