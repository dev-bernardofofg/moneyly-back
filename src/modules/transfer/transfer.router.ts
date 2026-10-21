import { Router } from 'express';
import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import { validateBody, validateParams, validateQuery } from '@core/middlewares/validate';
import { idParamSchema } from '@core/schemas/id-param.schema';
import { authenticateUser, type AuthRequest } from '@modules/auth/middlewares/auth';
import { createTransferSchema, listTransfersQuerySchema } from './schemas/transfer.schema';
import {
  createTransferUseCase,
  deleteTransferUseCase,
  listTransfersUseCase,
} from './use-cases/transfer.use-cases';

const TransferRouter: Router = Router();

TransferRouter.use(authenticateUser);

TransferRouter.get(
  '/',
  validateQuery(listTransfersQuerySchema),
  asyncHandler<AuthRequest>(async (req, res) =>
    ResponseHandler.success(
      res,
      await listTransfersUseCase(req.user.id, req.query.periodId as string | undefined),
      'Transferências recuperadas'
    )
  )
);

TransferRouter.post(
  '/',
  validateBody(createTransferSchema),
  asyncHandler<AuthRequest>(async (req, res) =>
    ResponseHandler.created(
      res,
      await createTransferUseCase(req.user.id, req.body),
      'Transferência registrada'
    )
  )
);

TransferRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler<AuthRequest>(async (req, res) => {
    await deleteTransferUseCase(req.params.id!, req.user.id);
    return ResponseHandler.success(res, null, 'Transferência removida');
  })
);

export { TransferRouter };
