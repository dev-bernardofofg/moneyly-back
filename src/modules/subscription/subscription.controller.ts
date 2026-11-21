import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import type { AuthRequest } from '@modules/auth/middlewares/auth';
import { convertSubscriptionToRecurringUseCase } from './use-cases/convert-subscription-to-recurring.use-case';
import { detectSubscriptionsUseCase } from './use-cases/detect-subscriptions.use-case';

export const getSubscriptions = asyncHandler<AuthRequest>(async (req, res) => {
  const candidates = await detectSubscriptionsUseCase(req.user.id);
  return ResponseHandler.success(res, candidates, 'Possíveis assinaturas detectadas');
});

export const createRecurringFromSubscription = asyncHandler<AuthRequest>(async (req, res) => {
  const { title, amount, categoryId, cadence, nextEstimatedDate, description } = req.body;
  const recurring = await convertSubscriptionToRecurringUseCase(req.user.id, {
    title,
    amount,
    categoryId,
    cadence,
    nextEstimatedDate,
    description,
  });
  return ResponseHandler.created(
    res,
    recurring,
    'Assinatura convertida em transação recorrente com sucesso'
  );
});
