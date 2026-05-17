import { Router } from "express";
import {
  getAvailablePeriods,
  getDashboardOverview,
  getFinancialInsights,
  getForecast,
  getPlannerOverview,
} from "../controllers/overview.controller";
import { authenticateUser } from "../middlewares/auth";
import { ensurePeriodExists } from "../middlewares/auto-period-creation";
import { validate } from "../middlewares/validate";
import {
  forecastQuerySchema,
  getAvailablePeriodsQuerySchema,
  getDashboardOverviewQuerySchema,
} from "../schemas/overview.schema";

const OverviewRouter: Router = Router();

OverviewRouter.use(authenticateUser);
OverviewRouter.use(ensurePeriodExists);

OverviewRouter.get(
  "/periods",
  validate({ query: getAvailablePeriodsQuerySchema }),
  getAvailablePeriods
);

OverviewRouter.get(
  "/dashboard",
  validate({ query: getDashboardOverviewQuerySchema }),
  getDashboardOverview
);

OverviewRouter.get("/planner", getPlannerOverview);

OverviewRouter.get("/insights", getFinancialInsights);

OverviewRouter.get(
  "/forecast",
  validate({ query: forecastQuerySchema }),
  getForecast
);

export { OverviewRouter };
