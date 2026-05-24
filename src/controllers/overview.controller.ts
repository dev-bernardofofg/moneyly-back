import { formatBrazilianDate } from '../helpers/dates';
import { getCurrentFinancialPeriod } from '../helpers/financial-period';
import { ResponseHandler } from '../helpers/response-handler';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import type { GetDashboardOverviewQuery } from '../schemas/overview.schema';
import {
  getAvailablePeriodsService,
  getDashboardOverviewService,
  getDashboardPreviewsService,
  getFinancialInsightsService,
  getPlannerOverviewService,
  getTransactionsByUserId,
} from '../services/overview.service';
import { getForecastService } from '../services/forecast.service';
import { getComparativeInsightsService } from '../services/comparative-insights.service';

export const getDashboardOverview = asyncHandler<
  AuthRequest & { query: GetDashboardOverviewQuery }
>(async (req, res) => {
  const { user } = req;
  const { periodId } = req.query;
  const { id: userId, financialDayStart, financialDayEnd, monthlyIncome } = user;

  const { transactions, availablePeriods, selectedPeriod } = await getTransactionsByUserId(
    userId,
    { startDay: financialDayStart ?? 1, endDay: financialDayEnd ?? 31 },
    periodId
  );

  const { stats, chart, recentTransactions } = await getDashboardOverviewService(
    Number(monthlyIncome) || 0,
    transactions
  );

  const previews = await getDashboardPreviewsService(
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
  const availablePeriods = await getAvailablePeriodsService(req.user.id);
  return ResponseHandler.success(
    res,
    availablePeriods,
    'Períodos financeiros disponíveis recuperados com sucesso'
  );
});

export const getFinancialInsights = asyncHandler<AuthRequest>(async (req, res) => {
  const insights = await getFinancialInsightsService(
    req.user.id,
    Number(req.user.monthlyIncome) || 0
  );
  return ResponseHandler.success(res, insights, 'Insights financeiros gerados com sucesso');
});

export const getForecast = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodId } = req.query as { periodId?: string };
  const forecast = await getForecastService(req.user.id, periodId);
  return ResponseHandler.success(res, forecast, 'Projeção de saldo gerada com sucesso');
});

export const getComparativeInsights = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodsBack } = req.query as { periodsBack?: number };
  const data = await getComparativeInsightsService(req.user.id, periodsBack);
  return ResponseHandler.success(res, data, 'Insights comparativos gerados com sucesso');
});

export const getPlannerOverview = asyncHandler<AuthRequest>(async (req, res) => {
  const { id: userId, financialDayStart, financialDayEnd, monthlyIncome } = req.user;

  const currentPeriod = getCurrentFinancialPeriod(financialDayStart ?? 1, financialDayEnd ?? 31);

  const { stats, alerts } = await getPlannerOverviewService(userId, Number(monthlyIncome) || 0);

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
