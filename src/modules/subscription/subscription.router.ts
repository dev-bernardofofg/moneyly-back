import { Router } from 'express';
import { validate } from '@core/middlewares/validate';
import { authenticateUser } from '@modules/auth/middlewares/auth';
import { ensurePeriodExists } from '@modules/financial-period';
import { fromSubscriptionSchema } from '@modules/recurring-transaction/schemas/recurring-transaction.schema';
import { createRecurringFromSubscription, getSubscriptions } from './subscription.controller';

const SubscriptionRouter: Router = Router();

// Router montado na raiz, porque os paths públicos vivem sob /transactions e
// /recurring-transactions. Middleware vai por rota: um .use() aqui rodaria em toda requisição.
SubscriptionRouter.get(
  '/transactions/subscriptions',
  authenticateUser,
  ensurePeriodExists,
  getSubscriptions
);

SubscriptionRouter.post(
  '/recurring-transactions/from-subscription',
  authenticateUser,
  validate({ body: fromSubscriptionSchema }),
  createRecurringFromSubscription
);

export { SubscriptionRouter };
