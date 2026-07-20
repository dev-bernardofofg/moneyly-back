/**
 * Registro OpenAPI do módulo recurring-transaction (importado por core/openapi/generate).
 */
import { z } from '@core/openapi/registry';
import { wrapPaginated, wrapSuccess } from '@core/openapi/envelopes';
import { RecurringTransactionSchema, TransactionSchema } from '@core/openapi/schemas';
import { created, nullData, ok, route } from '@core/openapi/route';
import { idParamSchema } from '@core/schemas/id-param.schema';
import {
  fromSubscriptionSchema,
  recurringTransactionSchema,
  recurringTransactionUpdateSchema,
} from './schemas/recurring-transaction.schema';

const intQuery = z.coerce.number().int().positive().optional();
const recurringListQuery = z.object({
  includeInactive: z.coerce.boolean().optional(),
  page: intQuery,
  limit: intQuery,
});

route({
  method: 'post',
  path: '/recurring-transactions/',
  tag: 'RecurringTransactions',
  summary: 'Criar transação recorrente',
  body: recurringTransactionSchema,
  ok: created(wrapSuccess(RecurringTransactionSchema)),
});
route({
  method: 'post',
  path: '/recurring-transactions/from-subscription',
  tag: 'RecurringTransactions',
  summary: 'Converter assinatura detectada em recorrente (F10)',
  body: fromSubscriptionSchema,
  ok: created(wrapSuccess(RecurringTransactionSchema)),
});
route({
  method: 'get',
  path: '/recurring-transactions/',
  tag: 'RecurringTransactions',
  summary: 'Listar recorrentes (paginado)',
  query: recurringListQuery,
  ok: ok(wrapPaginated(RecurringTransactionSchema)),
});
route({
  method: 'put',
  path: '/recurring-transactions/{id}',
  tag: 'RecurringTransactions',
  summary: 'Atualizar recorrente',
  body: recurringTransactionUpdateSchema,
  params: idParamSchema,
  ok: ok(wrapSuccess(RecurringTransactionSchema)),
});
route({
  method: 'get',
  path: '/recurring-transactions/{id}/transactions',
  tag: 'RecurringTransactions',
  summary: 'Histórico de execuções',
  params: idParamSchema,
  ok: ok(wrapSuccess(z.array(TransactionSchema))),
});
route({
  method: 'patch',
  path: '/recurring-transactions/{id}/reactivate',
  tag: 'RecurringTransactions',
  summary: 'Reativar recorrente',
  params: idParamSchema,
  ok: ok(wrapSuccess(RecurringTransactionSchema)),
});
route({
  method: 'patch',
  path: '/recurring-transactions/{id}/deactivate',
  tag: 'RecurringTransactions',
  summary: 'Desativar recorrente',
  params: idParamSchema,
  ok: ok(nullData),
});
route({
  method: 'delete',
  path: '/recurring-transactions/{id}',
  tag: 'RecurringTransactions',
  summary: 'Deletar recorrente',
  params: idParamSchema,
  ok: ok(nullData),
});
