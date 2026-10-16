import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { env } from '@core/config/env';
import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import { runScheduledJobs } from './scheduled-jobs';

const isAuthorized = (header: string | undefined): boolean => {
  if (!env.CRON_SECRET || !header) return false;
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

const CronRouter: Router = Router();

// Vercel Cron chama com GET e envia "Authorization: Bearer <CRON_SECRET>".
CronRouter.get(
  '/daily',
  asyncHandler(async (req, res) => {
    if (!isAuthorized(req.headers.authorization)) return ResponseHandler.unauthorized(res);

    const { failed } = await runScheduledJobs();
    if (failed.length > 0) {
      return ResponseHandler.error(res, `Jobs com falha: ${failed.join(', ')}`, null, 500);
    }
    return ResponseHandler.success(res, null, 'Jobs agendados executados');
  })
);

export { CronRouter };
