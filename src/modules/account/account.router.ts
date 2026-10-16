import { Router } from 'express';
import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import { validateBody, validateParams } from '@core/middlewares/validate';
import { idParamSchema } from '@core/schemas/id-param.schema';
import { authenticateUser, type AuthRequest } from '@modules/auth/middlewares/auth';
import { createAccountSchema, updateAccountSchema } from './schemas/account.schema';
import {
  createAccountUseCase,
  deleteAccountUseCase,
  listAccountsUseCase,
  updateAccountUseCase,
} from './use-cases/account.use-cases';

const AccountRouter: Router = Router();

AccountRouter.use(authenticateUser);

AccountRouter.get(
  '/',
  asyncHandler<AuthRequest>(async (req, res) =>
    ResponseHandler.success(res, await listAccountsUseCase(req.user.id), 'Contas recuperadas')
  )
);

AccountRouter.post(
  '/',
  validateBody(createAccountSchema),
  asyncHandler<AuthRequest>(async (req, res) =>
    ResponseHandler.created(res, await createAccountUseCase(req.user.id, req.body), 'Conta criada')
  )
);

AccountRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateAccountSchema),
  asyncHandler<AuthRequest>(async (req, res) =>
    ResponseHandler.success(
      res,
      await updateAccountUseCase(req.params.id!, req.user.id, req.body),
      'Conta atualizada'
    )
  )
);

AccountRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler<AuthRequest>(async (req, res) => {
    await deleteAccountUseCase(req.params.id!, req.user.id);
    return ResponseHandler.success(res, null, 'Conta removida');
  })
);

export { AccountRouter };
