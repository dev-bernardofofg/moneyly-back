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
import { validateBody, validateParams } from "../middlewares/validate";
import { idParamSchema } from "../schemas/auth.schema";
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
GoalRouter.get("/:id", validateParams(idParamSchema), getGoalById);

// Atualizar objetivo
GoalRouter.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateSavingsGoalSchema),
  updateSavingsGoal
);

// Adicionar valor ao objetivo
GoalRouter.post(
  "/:id/add-amount",
  validateParams(idParamSchema),
  validateBody(addAmountToGoalSchema),
  addAmountToGoal
);

// Deletar objetivo
GoalRouter.delete("/:id", validateParams(idParamSchema), deleteSavingsGoal);

export default GoalRouter;
