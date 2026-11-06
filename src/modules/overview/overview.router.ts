import { Router } from 'express';
import {
  getAvailablePeriods,
  getCardBills,
  getDashboardOverview,
  getFinancialInsights,
  getForecast,
} from './overview.controller';
import { authenticateUser } from '@modules/auth/middlewares/auth';
import { ensurePeriodExists } from '@modules/financial-period';
import { validate } from '@core/middlewares/validate';
import {
  forecastQuerySchema,
  getAvailablePeriodsQuerySchema,
  getDashboardOverviewQuerySchema,
} from './schemas/overview.schema';

const OverviewRouter: Router = Router();

OverviewRouter.use(authenticateUser);
OverviewRouter.use(ensurePeriodExists);

OverviewRouter.get(
  '/periods',
  validate({ query: getAvailablePeriodsQuerySchema }),
  getAvailablePeriods
);

OverviewRouter.get(
  '/dashboard',
  validate({ query: getDashboardOverviewQuerySchema }),
  getDashboardOverview
);

OverviewRouter.get('/insights', validate({ query: forecastQuerySchema }), getFinancialInsights);

OverviewRouter.get('/forecast', getForecast);

OverviewRouter.get('/card-bills', validate({ query: forecastQuerySchema }), getCardBills);

export { OverviewRouter };
