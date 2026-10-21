import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { AuthRouters } from '@modules/auth';
import { BudgetRouter } from '@modules/budget';
import { CategoryRouter } from '@modules/category';
import savingsGoalRoutes from '@modules/goal/goal.router';
import { NotificationRouter } from '@modules/notification';
import { OverviewRouter } from '@modules/overview';
import { CompanyRouter, OvertimeRouter } from '@modules/overtime';
import { RecurringTransactionRouter } from '@modules/recurring-transaction';
import transactionRoutes from '@modules/transaction/transaction.router';
import { UserRouters } from '@modules/user';
import { AccountRouter } from '@modules/account';
import { TransferRouter } from '@modules/transfer';
// Import estático: o tsc copia o JSON para dist/ e o bundle da Vercel o inclui (readFileSync em
// runtime não era rastreado e /api-docs ficava vazio em produção).
import openApiDocument from '../openapi.json';

const router: Router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

router.use('/api-docs', swaggerUi.serve);
router.get(
  '/api-docs',
  swaggerUi.setup(openApiDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Moneyly API Documentation',
  })
);

router.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openApiDocument);
});

router.use('/auth', AuthRouters);
router.use('/user', UserRouters);
router.use('/transactions', transactionRoutes);
router.use('/categories', CategoryRouter);
router.use('/budgets', BudgetRouter);
router.use('/goals', savingsGoalRoutes);
router.use('/overview', OverviewRouter);
router.use('/recurring-transactions', RecurringTransactionRouter);
router.use('/notifications', NotificationRouter);
router.use('/companies', CompanyRouter);
router.use('/overtime', OvertimeRouter);
router.use('/accounts', AccountRouter);
router.use('/transfers', TransferRouter);

export default router;
