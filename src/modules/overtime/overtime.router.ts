import { Router } from 'express';
import {
  createOvertime,
  deleteOvertime,
  exportOvertimeCsv,
  getOvertime,
  getOvertimeSummary,
  updateOvertime,
} from './overtime.controller';
import { authenticateUser } from '../auth/middlewares/auth';
import { ensurePeriodExists } from '../financial-period/middlewares/ensure-period-exists';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validate';
import { idParamSchema } from '../../core/schemas/id-param.schema';
import {
  createOvertimeSchema,
  overtimeExportQuerySchema,
  overtimeListQuerySchema,
  overtimeSummaryQuerySchema,
  updateOvertimeSchema,
} from './schemas/overtime.schema';

const OvertimeRouter: Router = Router();

OvertimeRouter.use(authenticateUser);
OvertimeRouter.use(ensurePeriodExists);

OvertimeRouter.post('/', validateBody(createOvertimeSchema), createOvertime);
OvertimeRouter.get('/', validateQuery(overtimeListQuerySchema), getOvertime);
OvertimeRouter.get('/summary', validateQuery(overtimeSummaryQuerySchema), getOvertimeSummary);
OvertimeRouter.get('/export', validateQuery(overtimeExportQuerySchema), exportOvertimeCsv);
OvertimeRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateOvertimeSchema),
  updateOvertime
);
OvertimeRouter.delete('/:id', validateParams(idParamSchema), deleteOvertime);

export default OvertimeRouter;
