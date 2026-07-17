import type { Application } from 'express';
import express from 'express';
import { connectDB } from './infra/db';
import { env } from './core/config/env';
import { logger } from './core/lib/logger';
import { errorHandler } from './core/middlewares/error-handler';
import { sanitizeData } from './core/middlewares/sanitize';
import { securityMiddleware } from './core/middlewares/security';
import router from './routes';
import { processRecurringTransactions } from './modules/recurring-transaction';

import { processBillReminders, processBudgetAlerts } from './modules/notification';

export const app: Application = express();

// Aplicar middlewares de segurança
securityMiddleware(app);

// Parser de JSON
app.use(express.json({ limit: '10mb' })); // Limitar tamanho do payload

// Sanitização de dados
app.use(sanitizeData);

connectDB();

app.use(router);

// Global error handler - deve ser o último middleware
app.use(errorHandler);

// Só inicia o servidor se não estiver em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    logger.info(`Servidor rodando na porta ${env.PORT}`);
  });

  // Process recurring transactions every hour
  setInterval(
    async () => {
      try {
        await processRecurringTransactions();
      } catch (error) {
        logger.error('[scheduler] recurring transactions error', error as Error);
      }
      try {
        await processBudgetAlerts();
      } catch (error) {
        logger.error('[scheduler] budget alerts error', error as Error);
      }
      try {
        await processBillReminders();
      } catch (error) {
        logger.error('[scheduler] bill reminders error', error as Error);
      }
    },
    60 * 60 * 1000
  );

  // Also run once at startup to catch any missed executions
  processRecurringTransactions().catch((error) =>
    logger.error('[scheduler] startup run error', error as Error)
  );
  processBudgetAlerts().catch((error) =>
    logger.error('[scheduler] budget alerts startup error', error as Error)
  );
  processBillReminders().catch((error) =>
    logger.error('[scheduler] bill reminders startup error', error as Error)
  );
}
