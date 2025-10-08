import { NextFunction, Response } from "express";
import { FinancialPeriodService } from "../services/financial-period.service";
import { AuthenticatedRequest } from "./auth";

export const ensurePeriodExists = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next();
    }

    // Criar apenas período atual + 1 período futuro (para planejamento)
    await FinancialPeriodService.ensureCurrentPeriodExists(userId);
    await FinancialPeriodService.createNextPeriods(userId, 1); // Só 1 período futuro

    next();
  } catch (error) {
    // Não logar erro aqui pois não deve bloquear a requisição
    next();
  }
};
