import { NextFunction, Request, Response } from "express";
import { FinancialPeriodService } from "../services/financial-period.service";

export const ensurePeriodExists = async (
  req: Request, // Mudança aqui: usar Request padrão
  res: Response,
  next: NextFunction
) => {
  try {
    // Type assertion para acessar user
    const userId = (req as any).user?.id;

    if (!userId) {
      return next();
    }

    // Garantir que o período atual existe
    await FinancialPeriodService.ensureCurrentPeriodExists(userId);

    next();
  } catch (error) {
    console.error("Erro ao criar período automaticamente:", error);
    // Não falhar a requisição, apenas logar o erro
    next();
  }
};
