import { Router } from 'express';
import {
  createRecurringFromSubscription,
  createRecurringTransaction,
  deactivateRecurringTransaction,
  deleteRecurringTransaction,
  getRecurringTransactionHistory,
  getRecurringTransactions,
  reactivateRecurringTransaction,
  updateRecurringTransaction,
} from '../controllers/recurring-transaction.controller';
import { authenticateUser } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/auth.schema';
import {
  fromSubscriptionSchema,
  recurringTransactionQuerySchema,
  recurringTransactionSchema,
  recurringTransactionUpdateSchema,
} from '../schemas/recurring-transaction.schema';

const RecurringTransactionRouter: Router = Router();

RecurringTransactionRouter.use(authenticateUser);

RecurringTransactionRouter.post(
  '/',
  validate({ body: recurringTransactionSchema }),
  createRecurringTransaction
);
RecurringTransactionRouter.post(
  '/from-subscription',
  validate({ body: fromSubscriptionSchema }),
  createRecurringFromSubscription
);
RecurringTransactionRouter.get(
  '/',
  validate({ query: recurringTransactionQuerySchema }),
  getRecurringTransactions
);
RecurringTransactionRouter.put(
  '/:id',
  validate({ body: recurringTransactionUpdateSchema, params: idParamSchema }),
  updateRecurringTransaction
);
RecurringTransactionRouter.get(
  '/:id/transactions',
  validate({ params: idParamSchema }),
  getRecurringTransactionHistory
);
RecurringTransactionRouter.patch(
  '/:id/reactivate',
  validate({ params: idParamSchema }),
  reactivateRecurringTransaction
);
RecurringTransactionRouter.patch(
  '/:id/deactivate',
  validate({ params: idParamSchema }),
  deactivateRecurringTransaction
);
RecurringTransactionRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  deleteRecurringTransaction
);

export { RecurringTransactionRouter };
