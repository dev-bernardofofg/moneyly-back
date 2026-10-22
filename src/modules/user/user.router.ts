import { Router } from 'express';
import {
  getFinancialPeriodById,
  getFinancialPeriods,
  getMe,
  updateFinancialPeriod,
  updateIncomeAndPeriod,
} from './user.controller';
import { authenticateUser } from '@modules/auth/middlewares/auth';
import { validateBody, validateParams } from '@core/middlewares/validate';
import {
  periodIdParamSchema,
  updateFinancialPeriodSchema,
  updateIncomeAndPeriodSchema,
} from './schemas/user.schema';

const UserRouters: Router = Router();

// Rotas de perfil do usuário
UserRouters.get('/me', authenticateUser, getMe);

// Rotas de configuração financeira
UserRouters.put(
  '/financial-period',
  authenticateUser,
  validateBody(updateFinancialPeriodSchema),
  updateFinancialPeriod
);

UserRouters.put(
  '/income-and-period',
  authenticateUser,
  validateBody(updateIncomeAndPeriodSchema),
  updateIncomeAndPeriod
);

UserRouters.get('/financial-periods', authenticateUser, getFinancialPeriods);

UserRouters.get(
  '/financial-periods/:periodId',
  authenticateUser,
  validateParams(periodIdParamSchema),
  getFinancialPeriodById
);

export { UserRouters };
