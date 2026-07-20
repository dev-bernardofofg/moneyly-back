import { Router } from 'express';
import {
  createCategoryBudget,
  deleteCategoryBudget,
  getUserBudgets,
  updateCategoryBudget,
} from './budget.controller';
import { authenticateUser } from '@modules/auth/middlewares/auth';
import { ensurePeriodExists } from '@modules/financial-period/middlewares/ensure-period-exists';
import { validateBody, validateParams, validateQuery } from '@core/middlewares/validate';
import { idParamSchema } from '@core/schemas/id-param.schema';
import {
  createCategoryBudgetSchema,
  getBudgetsQuerySchema,
  updateCategoryBudgetSchema,
} from './schemas/budget.schema';

const BudgetRouter: Router = Router();

BudgetRouter.use(authenticateUser);
BudgetRouter.use(ensurePeriodExists);

// Criar orçamento por categoria
BudgetRouter.post('/', validateBody(createCategoryBudgetSchema), createCategoryBudget);

// Buscar orçamentos do usuário
BudgetRouter.get('/', validateQuery(getBudgetsQuerySchema), getUserBudgets);

// Atualizar orçamento
BudgetRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCategoryBudgetSchema),
  updateCategoryBudget
);

// Deletar orçamento
BudgetRouter.delete('/:id', validateParams(idParamSchema), deleteCategoryBudget);

export { BudgetRouter };
