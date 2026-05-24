import { Router } from 'express';
import {
  createOvertime,
  deleteOvertime,
  getOvertime,
  getOvertimeSummary,
  updateOvertime,
} from '../controllers/overtime.controller';
import { authenticateUser } from '../middlewares/auth';
import { ensurePeriodExists } from '../middlewares/auto-period-creation';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate';
import { idParamSchema } from '../schemas/auth.schema';
import {
  createOvertimeSchema,
  overtimeListQuerySchema,
  overtimeSummaryQuerySchema,
  updateOvertimeSchema,
} from '../schemas/overtime.schema';

const OvertimeRouter: Router = Router();

OvertimeRouter.use(authenticateUser);
OvertimeRouter.use(ensurePeriodExists);

OvertimeRouter.post('/', validateBody(createOvertimeSchema), createOvertime);
OvertimeRouter.get('/', validateQuery(overtimeListQuerySchema), getOvertime);
OvertimeRouter.get('/summary', validateQuery(overtimeSummaryQuerySchema), getOvertimeSummary);
OvertimeRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateOvertimeSchema),
  updateOvertime
);
OvertimeRouter.delete('/:id', validateParams(idParamSchema), deleteOvertime);

export default OvertimeRouter;
