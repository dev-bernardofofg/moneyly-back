import { formatBrazilianDate } from '@core/helpers/dates';
import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import type { AuthRequest } from '@modules/auth/middlewares/auth';
import type { GetDashboardOverviewQuery } from './schemas/overview.schema';
import { getAvailablePeriodsUseCase } from './use-cases/get-available-periods.use-case';
import { getCardBillsUseCase } from './use-cases/get-card-bills.use-case';
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
  const { id: userId, financialDayStart, financialDayEnd } = user;

  const { transactions, availablePeriods, selectedPeriod } = await getPeriodTransactionsUseCase(
    userId,
    { startDay: financialDayStart ?? 1, endDay: financialDayEnd ?? 31 },
    periodId
  );

  const { stats, chart, recentTransactions } = await getDashboardOverviewUseCase(transactions);

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
  const { periodId } = req.query as { periodId?: string };
  const insights = await getFinancialInsightsUseCase(req.user.id, periodId);
  return ResponseHandler.success(res, insights, 'Insights financeiros gerados com sucesso');
});

export const getForecast = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodId } = req.query as { periodId?: string };
  const forecast = await getForecastUseCase(req.user.id, periodId);
  return ResponseHandler.success(res, forecast, 'Projeção de saldo gerada com sucesso');
});

export const getPlannerOverview = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodId } = req.query as { periodId?: string };
  const { stats, alerts, period, freeBalanceImpact } = await getPlannerOverviewUseCase(
    req.user.id,
    periodId
  );

  return ResponseHandler.success(
    res,
    {
      stats,
      currentPeriod: {
        id: period.id,
        startDate: period.startDate,
        endDate: period.endDate,
        description: `Período financeiro: ${formatBrazilianDate(period.startDate)} a ${formatBrazilianDate(period.endDate)}`,
      },
      freeBalanceImpact,
      alerts,
    },
    'Stats do planejamento recuperados com sucesso'
  );
});

export const getCardBills = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodId } = req.query as { periodId?: string };
  const bills = await getCardBillsUseCase(req.user.id, periodId);
  return ResponseHandler.success(res, bills, 'Faturas do período recuperadas com sucesso');
});
