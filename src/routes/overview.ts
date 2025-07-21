import { Router } from "express";
import { getDashboardOverview } from "../controllers/overviewController";
import { getPlannerOverview } from "../controllers/overviewPlannerController";
import { authenticateUser } from "../middlewares/auth";

const OverviewRouter: Router = Router();

// Rota principal do dashboard - retorna todos os dados consolidados
OverviewRouter.get("/dashboard", authenticateUser, getDashboardOverview);

OverviewRouter.get("/planner", authenticateUser, getPlannerOverview);

export { OverviewRouter };
