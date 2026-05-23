import { NextFunction, Response } from 'express';
import { logger } from '../lib/logger';
import { financialPeriodService } from '../services/financial-period.service';
import { AuthenticatedRequest } from './auth';

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

    // Criar apenas período atual + 1 período futuro (para planejamento)
    await financialPeriodService.ensureCurrentPeriodExists(userId);
    await financialPeriodService.createNextPeriods(userId, 1); // Só 1 período futuro

    next();
  } catch (error) {
    logger.warn('ensurePeriodExists failed silently', { error });
    next();
  }
};
