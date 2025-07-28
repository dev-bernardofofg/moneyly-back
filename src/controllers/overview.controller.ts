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
    const { transactions, availablePeriods, selectedPeriod } =
      await getTransactionsByUserId(
        userId,
        { startDate: new Date(), endDate: new Date() },
        { startDay: financialDayStart ?? 1, endDay: financialDayEnd ?? 31 },
        periodId
      );

    const { stats, monthlyHistory, expensesByCategory, periodTransactions } =
      await getDashboardOverviewService(userId, monthlyIncome, selectedPeriod!);

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
