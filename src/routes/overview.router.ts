import { Router } from "express";
import {
  getAvailablePeriods,
  getDashboardOverview,
  getPlannerOverview,
} from "../controllers/overview.controller";
import { authenticateUser } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import {
  getAvailablePeriodsSchema,
  getDashboardOverviewSchema,
} from "../schemas/overview.schema";

const OverviewRouter: Router = Router();

// Buscar períodos financeiros disponíveis
OverviewRouter.post(
  "/periods",
  authenticateUser,
  validateBody(getAvailablePeriodsSchema),
  getAvailablePeriods
);

// Rota principal do dashboard - retorna dados de um período específico
OverviewRouter.post(
  "/dashboard",
  authenticateUser,
  validateBody(getDashboardOverviewSchema),
  getDashboardOverview
);

OverviewRouter.get("/planner", authenticateUser, getPlannerOverview);

export { OverviewRouter };
