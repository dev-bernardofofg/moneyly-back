import { Router } from "express";
import {
  getAvailablePeriods,
  getDashboardOverview,
  getPlannerOverview,
} from "../controllers/overview.controller";
import { authenticateUser } from "../middlewares/auth";
import { ensurePeriodExists } from "../middlewares/auto-period-creation";
import { validateBody } from "../middlewares/validate";
import {
  getAvailablePeriodsSchema,
  getDashboardOverviewSchema,
} from "../schemas/overview.schema";

const OverviewRouter: Router = Router();

OverviewRouter.use(authenticateUser);
OverviewRouter.use(ensurePeriodExists);

// Buscar períodos financeiros disponíveis
OverviewRouter.post(
  "/periods",
  validateBody(getAvailablePeriodsSchema),
  getAvailablePeriods
);

// Rota principal do dashboard - retorna dados de um período específico
OverviewRouter.post(
  "/dashboard",
  validateBody(getDashboardOverviewSchema),
  getDashboardOverview
);

OverviewRouter.get("/planner", getPlannerOverview);

export { OverviewRouter };
