import type { NextFunction, Response } from 'express';
import { formatBrazilianDate } from '../helpers/dates';
import { isHttpError } from '../helpers/errors';
import { getCurrentFinancialPeriod } from '../helpers/financial-period';
import { ResponseHandler } from '../helpers/response-handler';
import type { AuthenticatedRequest } from '../middlewares/auth';
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

export const getDashboardOverview = async (
  req: AuthenticatedRequest & { query: GetDashboardOverviewQuery },
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { user } = req;
  const { periodId } = req.query;
  const { id: userId, financialDayStart, financialDayEnd, monthlyIncome } = user;

  try {
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
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao buscar dados do dashboard', error);
  }
};

export const getAvailablePeriods = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  try {
    const availablePeriods = await getAvailablePeriodsService(req.user.id);
    return ResponseHandler.success(
      res,
      availablePeriods,
      'Períodos financeiros disponíveis recuperados com sucesso'
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao buscar períodos disponíveis', error);
  }
};

export const getFinancialInsights = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  try {
    const insights = await getFinancialInsightsService(
      req.user.id,
      Number(req.user.monthlyIncome) || 0
    );
    return ResponseHandler.success(res, insights, 'Insights financeiros gerados com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao gerar insights financeiros', error);
  }
};

export const getForecast = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { periodId } = req.query as { periodId?: string };

  try {
    const forecast = await getForecastService(req.user.id, periodId);
    return ResponseHandler.success(res, forecast, 'Projeção de saldo gerada com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao gerar projeção de saldo', error);
  }
};

export const getComparativeInsights = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { periodsBack } = req.query as { periodsBack?: number };

  try {
    const data = await getComparativeInsightsService(req.user.id, periodsBack);
    return ResponseHandler.success(res, data, 'Insights comparativos gerados com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao gerar insights comparativos', error);
  }
};

export const getPlannerOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');

  const { id: userId, financialDayStart, financialDayEnd, monthlyIncome } = req.user;

  try {
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
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Erro ao buscar stats do planejamento', error);
  }
};
