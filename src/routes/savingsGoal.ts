import { Router } from "express";
import {
  addAmountToGoal,
  createSavingsGoal,
  deleteSavingsGoal,
  getGoalById,
  getGoalsProgress,
  getUserGoals,
  updateSavingsGoal,
} from "../controllers/savingsGoalController";
import { authenticateUser } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import {
  addAmountToGoalSchema,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
} from "../schemas/savingsGoalSchema";

const SavingsGoalRouter: Router = Router();

// Todas as rotas requerem autenticação
SavingsGoalRouter.use(authenticateUser);

// Criar objetivo de poupança
SavingsGoalRouter.post(
  "/",
  validateBody(createSavingsGoalSchema),
  createSavingsGoal
);

// Buscar objetivos do usuário
SavingsGoalRouter.get("/", getUserGoals);

// Buscar progresso dos objetivos
SavingsGoalRouter.get("/progress", getGoalsProgress);

// Buscar objetivo específico
SavingsGoalRouter.get("/:id", getGoalById);

// Atualizar objetivo
SavingsGoalRouter.put(
  "/:id",
  validateBody(updateSavingsGoalSchema),
  updateSavingsGoal
);

// Adicionar valor ao objetivo
SavingsGoalRouter.post(
  "/:id/add-amount",
  validateBody(addAmountToGoalSchema),
  addAmountToGoal
);

// Deletar objetivo
SavingsGoalRouter.delete("/:id", deleteSavingsGoal);

export default SavingsGoalRouter;
