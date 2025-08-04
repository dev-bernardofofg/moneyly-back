import { Response } from "express";
import { formatBrazilianDate } from "../helpers/date-utils";
import { getCurrentFinancialPeriod } from "../helpers/financial-period";
import { ResponseHandler } from "../helpers/response-handler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { GetDashboardOverviewRequest } from "../schemas/overview.schema";
import {
  getAvailablePeriodsService,
  getDashboardOverviewService,
  getPlannerOverviewService,
  getTransactionsByUserId,
} from "../services/overview.service";

export const getDashboardOverview = async (
  req: AuthenticatedRequest & { body: GetDashboardOverviewRequest },
  res: Response
) => {
  const {
    id: userId,
    financialDayStart,
    financialDayEnd,
    monthlyIncome,
  } = req.user;
  const { periodId } = req.body;
  try {
    // Se há periodId, buscar todas as transações para validar o período
    // Se não há periodId, usar data atual para buscar transações do período atual
    const dates = periodId
      ? { startDate: new Date(0), endDate: new Date() } // Buscar todas as transações
      : { startDate: new Date(), endDate: new Date() }; // Buscar apenas hoje

    const { transactions, availablePeriods, selectedPeriod } =
      await getTransactionsByUserId(
        userId,
        dates,
        { startDay: financialDayStart ?? 1, endDay: financialDayEnd ?? 31 },
        periodId
      );

    // Se há periodId, usar o período selecionado para buscar transações específicas
    const periodDates = selectedPeriod
      ? { startDate: selectedPeriod.startDate, endDate: selectedPeriod.endDate }
      : { startDate: new Date(), endDate: new Date() };

    const { stats, monthlyHistory, expensesByCategory, periodTransactions } =
      await getDashboardOverviewService(userId, monthlyIncome, periodDates);

    return ResponseHandler.success(
      res,
      {
        stats,
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
        monthlyHistory,
        expensesByCategory,
        transactionsCount: periodTransactions.length,
      },
      "Dados do dashboard recuperados com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao buscar dados do dashboard",
      error
    );
  }
};

export const getAvailablePeriods = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId, financialDayStart, financialDayEnd } = req.user;
  try {
    const availablePeriods = await getAvailablePeriodsService(
      userId,
      financialDayStart ?? 1,
      financialDayEnd ?? 31
    );

    return ResponseHandler.success(
      res,
      availablePeriods,
      "Períodos financeiros disponíveis recuperados com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao buscar períodos disponíveis",
      error
    );
  }
};

export const getPlannerOverview = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const {
    id: userId,
    financialDayStart,
    financialDayEnd,
    monthlyIncome,
  } = req.user;
  try {
    const currentPeriod = getCurrentFinancialPeriod(
      financialDayStart ?? 1,
      financialDayEnd ?? 31
    );

    const { stats, alerts } = await getPlannerOverviewService(
      userId,
      monthlyIncome
    );

    return ResponseHandler.success(
      res,
      {
        stats,
        currentPeriod: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          description: `Período financeiro: ${currentPeriod.startDate.toLocaleDateString(
            "pt-BR"
          )} a ${currentPeriod.endDate.toLocaleDateString("pt-BR")}`,
        },
        alerts,
      },
      "Stats do planejamento recuperados com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao buscar stats do planejamento",
      error
    );
  }
};
