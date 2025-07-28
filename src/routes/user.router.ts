import { Router } from "express";
import {
  getMe,
  updateFinancialPeriod,
  updateIncomeAndPeriod,
  updateMonthlyIncome,
} from "../controllers/user.controller";
import { authenticateUser } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
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

export { UserRouters };
