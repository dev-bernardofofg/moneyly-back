import { NextFunction, Response } from 'express';
import { logger } from '../../../core/lib/logger';
import { financialPeriodService } from '../financial-period.service';
import { AuthenticatedRequest } from '../../auth/middlewares/auth';

export const ensurePeriodExists = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next();
    }

    await financialPeriodService.ensureCurrentPeriodExists(userId);
    await financialPeriodService.createNextPeriods(userId, 1); // Só 1 período futuro

    next();
  } catch (error) {
    logger.warn('ensurePeriodExists failed silently', { error });
    next();
  }
};
