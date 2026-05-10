import type { NextFunction, Response } from "express";
import { isHttpError } from "../helpers/errors";
import { ResponseHandler } from "../helpers/response-handler";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { financialPeriodService } from "../services/financial-period.service";
import {
  updatefinancialPeriodService,
  updateIncomeAndPeriodService,
  updateUserProfileService,
} from "../services/user.service";

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const { id, name, email, monthlyIncome, financialDayStart, financialDayEnd, firstAccess, createdAt } = req.user;
    return ResponseHandler.success(
      res,
      {
        id,
        name,
        email,
        monthlyIncome: monthlyIncome ?? 0,
        financialDayStart: financialDayStart ?? 1,
        financialDayEnd: financialDayEnd ?? 31,
        firstAccess,
        createdAt,
      },
      "Dados do usuário recuperados com sucesso"
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.serverError(res);
  }
};

export const updateMonthlyIncome = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const { monthlyIncome } = req.body;
    const updatedUser = await updateUserProfileService(req.user, { monthlyIncome });
    return ResponseHandler.success(
      res,
      { monthlyIncome: updatedUser.monthlyIncome, firstAccess: false },
      "Rendimento atualizado com sucesso"
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.serverError(res);
  }
};

export const updateFinancialPeriod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const { financialDayStart, financialDayEnd } = req.body;
    await updatefinancialPeriodService(req.user.id, financialDayStart, financialDayEnd);
    return ResponseHandler.success(
      res,
      { financialDayStart, financialDayEnd, firstAccess: false },
      "Período financeiro atualizado com sucesso"
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.serverError(res);
  }
};

export const updateIncomeAndPeriod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const { monthlyIncome, financialDayStart, financialDayEnd } = req.body;
    await updateIncomeAndPeriodService(req.user.id, monthlyIncome, financialDayStart, financialDayEnd);
    return ResponseHandler.success(
      res,
      { monthlyIncome, financialDayStart, financialDayEnd, firstAccess: false },
      "Rendimento e período financeiro atualizados com sucesso"
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.serverError(res);
  }
};

export const getFinancialPeriods = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const periods = await financialPeriodService.getUserPeriods(req.user.id);
    return ResponseHandler.success(res, periods, "Períodos financeiros recuperados com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao buscar períodos financeiros", error);
  }
};

export const getFinancialPeriodById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { periodId } = req.params;
  if (!periodId) return ResponseHandler.badRequest(res, "ID do período não informado");

  try {
    const period = await financialPeriodService.getPeriodById(periodId, req.user.id);
    if (!period) return ResponseHandler.notFound(res, "Período financeiro não encontrado");
    return ResponseHandler.success(res, period, "Período financeiro recuperado com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao buscar período financeiro", error);
  }
};
