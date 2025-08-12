import { Router } from "express";
import {
  addAmountToGoal,
  createGoal,
  deleteSavingsGoal,
  getGoalById,
  getUserGoals,
  updateSavingsGoal,
} from "../controllers/goal.controller";
import { authenticateUser } from "../middlewares/auth";
import { ensurePeriodExists } from "../middlewares/auto-period-creation";
import { validateBody } from "../middlewares/validate";
import {
  addAmountToGoalSchema,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
} from "../schemas/goal.schema";

const GoalRouter: Router = Router();

// Todas as rotas requerem autenticação
GoalRouter.use(authenticateUser);
GoalRouter.use(ensurePeriodExists);

// Criar objetivo de poupança
GoalRouter.post("/", validateBody(createSavingsGoalSchema), createGoal);

// Buscar objetivos do usuário
GoalRouter.get("/", getUserGoals);

// Buscar objetivo específico
GoalRouter.get("/:id", getGoalById);

// Atualizar objetivo
GoalRouter.put(
  "/:id",
  validateBody(updateSavingsGoalSchema),
  updateSavingsGoal
);

// Adicionar valor ao objetivo
GoalRouter.post(
  "/:id/add-amount",
  validateBody(addAmountToGoalSchema),
  addAmountToGoal
);

// Deletar objetivo
GoalRouter.delete("/:id", deleteSavingsGoal);

export default GoalRouter;
