import { Router } from "express";
import {
  createCategoryBudget,
  deleteCategoryBudget,
  getUserBudgets,
  updateCategoryBudget,
} from "../controllers/budget.controller";
import { authenticateUser } from "../middlewares/auth";
import { ensurePeriodExists } from "../middlewares/auto-period-creation";
import { validateBody, validateParams } from "../middlewares/validate";
import { idParamSchema } from "../schemas/auth.schema";
import {
  createCategoryBudgetSchema,
  updateCategoryBudgetSchema,
} from "../schemas/category.schema";

const BudgetRouter: Router = Router();

BudgetRouter.use(authenticateUser);
BudgetRouter.use(ensurePeriodExists);

// Criar orçamento por categoria
BudgetRouter.post(
  "/",
  validateBody(createCategoryBudgetSchema),
  createCategoryBudget
);

// Buscar orçamentos do usuário
BudgetRouter.get("/", getUserBudgets);

// Atualizar orçamento
BudgetRouter.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateCategoryBudgetSchema),
  updateCategoryBudget
);

// Deletar orçamento
BudgetRouter.delete(
  "/:id",
  validateParams(idParamSchema),
  deleteCategoryBudget
);

export { BudgetRouter };
