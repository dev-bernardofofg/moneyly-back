import { Router } from "express";
import { getPlannerOverview } from "../controllers/overviewPlannerController";
import { authenticateUser } from "../middlewares/auth";

const router: Router = Router();

// Rota para obter stats do planejamento (orçamentos e objetivos)
router.get("/", authenticateUser, getPlannerOverview);

export default router;
