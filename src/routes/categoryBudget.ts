import { Router } from "express";
import {
  createCategoryBudget,
  deleteCategoryBudget,
  getBudgetProgress,
  getUserBudgets,
  updateCategoryBudget,
} from "../controllers/categoryBudgetController";
import { authenticateUser } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import {
  createCategoryBudgetSchema,
  updateCategoryBudgetSchema,
} from "../schemas/categorySchema";

const CategoryBudgetRouter: Router = Router();

// Todas as rotas requerem autenticação
CategoryBudgetRouter.use(authenticateUser);

// Criar orçamento por categoria
CategoryBudgetRouter.post(
  "/",
  validateBody(createCategoryBudgetSchema),
  createCategoryBudget
);

// Buscar orçamentos do usuário
CategoryBudgetRouter.get("/", getUserBudgets);

// Buscar progresso dos orçamentos
CategoryBudgetRouter.get("/progress", getBudgetProgress);

// Atualizar orçamento
CategoryBudgetRouter.put(
  "/:id",
  validateBody(updateCategoryBudgetSchema),
  updateCategoryBudget
);

// Deletar orçamento
CategoryBudgetRouter.delete("/:id", deleteCategoryBudget);

export default CategoryBudgetRouter;
