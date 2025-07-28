import { Router } from "express";
import {
  createCategoryBudget,
  deleteCategoryBudget,
  getUserBudgets,
  updateCategoryBudget,
} from "../controllers/budget.controller";
import { authenticateUser } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import {
  createCategoryBudgetSchema,
  updateCategoryBudgetSchema,
} from "../schemas/category.schema";

const BudgetRouter: Router = Router();

// Criar orçamento por categoria
BudgetRouter.post(
  "/",
  authenticateUser,
  validateBody(createCategoryBudgetSchema),
  createCategoryBudget
);

// Buscar orçamentos do usuário
BudgetRouter.get("/", authenticateUser, getUserBudgets);

// Atualizar orçamento
BudgetRouter.put(
  "/:id",
  authenticateUser,
  validateBody(updateCategoryBudgetSchema),
  updateCategoryBudget
);

// Deletar orçamento
BudgetRouter.delete("/:id", authenticateUser, deleteCategoryBudget);

export { BudgetRouter };
