import { Router } from "express";
import {
  getAvailablePeriods,
  getDashboardOverview,
  getPlannerOverview,
} from "../controllers/overview.controller";
import { authenticateUser } from "../middlewares/auth";
import { ensurePeriodExists } from "../middlewares/auto-period-creation";
import { validate } from "../middlewares/validate";
import {
  getAvailablePeriodsQuerySchema,
  getDashboardOverviewQuerySchema,
} from "../schemas/overview.schema";

const OverviewRouter: Router = Router();

OverviewRouter.use(authenticateUser);
OverviewRouter.use(ensurePeriodExists);

// Buscar períodos financeiros disponíveis
OverviewRouter.get(
  "/periods",
  validate({ query: getAvailablePeriodsQuerySchema }),
  getAvailablePeriods
);

// Rota principal do dashboard - retorna dados de um período específico
OverviewRouter.get(
  "/dashboard",
  validate({ query: getDashboardOverviewQuerySchema }),
  getDashboardOverview
);

OverviewRouter.get("/planner", getPlannerOverview);

export { OverviewRouter };
