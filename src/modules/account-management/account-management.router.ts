import { Router } from 'express';
import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import { validateBody, validateParams } from '@core/middlewares/validate';
import { idParamSchema } from '@core/schemas/id-param.schema';
import { authenticateUser, type AuthRequest } from '@modules/auth/middlewares/auth';
import {
  billPaymentParamsSchema,
  createAccountSchema,
  markBillPaidSchema,
  updateAccountSchema,
} from './schemas/account.schema';
import {
  markBillPaidUseCase,
  unmarkBillPaidUseCase,
} from './use-cases/card-bill-payment.use-cases';
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

AccountRouter.post(
  '/:id/bill-payment',
  validateParams(idParamSchema),
  validateBody(markBillPaidSchema),
  asyncHandler<AuthRequest>(async (req, res) =>
    ResponseHandler.success(
      res,
      await markBillPaidUseCase(req.user.id, req.params.id!, req.body.dueDate),
      'Fatura marcada como paga'
    )
  )
);

AccountRouter.delete(
  '/:id/bill-payment/:dueDate',
  validateParams(billPaymentParamsSchema),
  asyncHandler<AuthRequest>(async (req, res) => {
    await unmarkBillPaidUseCase(req.user.id, req.params.id!, req.params.dueDate!);
    return ResponseHandler.success(res, null, 'Fatura voltou para pendente');
  })
);

export { AccountRouter };
