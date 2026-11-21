/**
 * Registro OpenAPI do módulo subscription (importado por core/openapi/generate).
 * Paths e tags seguem os dos módulos vizinhos para o contrato público não mudar.
 */
import { z } from '@core/openapi/registry';
import { wrapSuccess } from '@core/openapi/envelopes';
import { RecurringTransactionSchema, SubscriptionCandidateSchema } from '@core/openapi/schemas';
import { created, ok, route } from '@core/openapi/route';
import { fromSubscriptionSchema } from '@modules/recurring-transaction/schemas/recurring-transaction.schema';

route({
  method: 'get',
  path: '/transactions/subscriptions',
  tag: 'Transactions',
  summary: 'Detectar assinaturas (heurística)',
  ok: ok(wrapSuccess(z.array(SubscriptionCandidateSchema))),
});
route({
  method: 'post',
  path: '/recurring-transactions/from-subscription',
  tag: 'RecurringTransactions',
  summary: 'Converter assinatura detectada em recorrente (F10)',
  body: fromSubscriptionSchema,
  ok: created(wrapSuccess(RecurringTransactionSchema)),
});
