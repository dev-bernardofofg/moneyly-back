import type { Application } from "express";
import express from "express";
import { connectDB } from "./db";
import { env } from "./env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middlewares/error-handler";
import { sanitizeData } from "./middlewares/sanitize";
import { securityMiddleware } from "./middlewares/security";
import router from "./routes";
import { processRecurringTransactions } from "./services/recurring-transaction.service";
import { processBudgetAlerts } from "./services/notification.service";

export const app: Application = express();

// Aplicar middlewares de segurança
securityMiddleware(app);

// Parser de JSON
app.use(express.json({ limit: "10mb" })); // Limitar tamanho do payload

// Sanitização de dados
app.use(sanitizeData);

connectDB();

app.use(router);

// Global error handler - deve ser o último middleware
app.use(errorHandler);

// Só inicia o servidor se não estiver em ambiente de teste
if (process.env.NODE_ENV !== "test") {
  app.listen(env.PORT, () => {
    logger.info(`Servidor rodando na porta ${env.PORT}`);
  });

  // Process recurring transactions every hour
  setInterval(
    async () => {
      try {
        await processRecurringTransactions();
      } catch (error) {
        logger.error("[scheduler] recurring transactions error", error as Error);
      }
      try {
        await processBudgetAlerts();
      } catch (error) {
        logger.error("[scheduler] budget alerts error", error as Error);
      }
    },
    60 * 60 * 1000
  );

  // Also run once at startup to catch any missed executions
  processRecurringTransactions().catch((error) =>
    logger.error("[scheduler] startup run error", error as Error)
  );
  processBudgetAlerts().catch((error) =>
    logger.error("[scheduler] budget alerts startup error", error as Error)
  );
}
