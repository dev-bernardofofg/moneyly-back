import { Response, Router } from "express";
import {
  getFinancialPeriods,
  getMe,
  updateFinancialPeriod,
  updateIncomeAndPeriod,
  updateMonthlyIncome,
} from "../controllers/user.controller";
import { ResponseHandler } from "../helpers/response-handler";
import { AuthenticatedRequest, authenticateUser } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import { FinancialPeriodRepository } from "../repositories/financial-period.repository";
import {
  updateFinancialPeriodSchema,
  updateIncomeAndPeriodSchema,
  updateMonthlyIncomeSchema,
} from "../schemas/user.schema";

const UserRouters: Router = Router();

// Rotas de perfil do usuário
UserRouters.get("/me", authenticateUser, getMe);

// Rotas de configuração financeira
UserRouters.put(
  "/income",
  authenticateUser,
  validateBody(updateMonthlyIncomeSchema),
  updateMonthlyIncome
);

UserRouters.put(
  "/financial-period",
  authenticateUser,
  validateBody(updateFinancialPeriodSchema),
  updateFinancialPeriod
);

UserRouters.put(
  "/income-and-period",
  authenticateUser,
  validateBody(updateIncomeAndPeriodSchema),
  updateIncomeAndPeriod
);

// ← NOVA ROTA: Listar períodos financeiros
UserRouters.get("/financial-periods", authenticateUser, getFinancialPeriods);

export const getFinancialPeriodById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { user } = req;
  const { periodId } = req.params;

  if (!user) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  const { id: userId } = user;

  try {
    // Aqui você precisaria adicionar um método no repository
    // const period = await FinancialPeriodRepository.findById(periodId, userId);

    // Por enquanto, vamos buscar todos e filtrar
    const periods = await FinancialPeriodRepository.findActiveByUser(userId);
    const period = periods.find((p) => p.id === periodId);

    if (!period) {
      return ResponseHandler.error(
        res,
        "Período financeiro não encontrado",
        null,
        404
      );
    }

    return ResponseHandler.success(
      res,
      period,
      "Período financeiro recuperado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao buscar período financeiro",
      error
    );
  }
};

// Buscar período específico por ID
UserRouters.get(
  "/financial-periods/:periodId",
  authenticateUser,
  getFinancialPeriodById
);

export { UserRouters };
