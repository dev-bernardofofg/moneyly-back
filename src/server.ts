import type { Application } from 'express';
import express from 'express';
import { connectDB } from '@infra/db';
import { env } from '@core/config/env';
import { logger } from '@core/lib/logger';
import { errorHandler } from '@core/middlewares/error-handler';
import { sanitizeData } from '@core/middlewares/sanitize';
import { securityMiddleware } from '@core/middlewares/security';
import router from './routes';
import { runScheduledJobs } from './jobs/scheduled-jobs';

export const app: Application = express();

securityMiddleware(app);

app.use(express.json({ limit: '10mb' })); // Limitar tamanho do payload

app.use(sanitizeData);

app.use(router);

app.use(errorHandler);

// Na Vercel (serverless) não há processo vivo: jobs rodam pelo Vercel Cron (vercel.json)
// e a conexão abre na primeira query. connectDB no import deixava um connect pendente
// que estourava CONNECT_TIMEOUT após o freeze e derrubava a instância (process.exit).
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  connectDB().catch(() => process.exit(1));

  app.listen(env.PORT, () => {
    logger.info(`Servidor rodando na porta ${env.PORT}`);
  });

  setInterval(runScheduledJobs, 60 * 60 * 1000);
  void runScheduledJobs();
}
