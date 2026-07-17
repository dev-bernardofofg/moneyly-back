/**
 * Registro OpenAPI do módulo transaction (importado por core/openapi/generate).
 * Inclui o endpoint de detecção de assinaturas (F3), montado neste router.
 */
import { z } from '../../core/openapi/registry';
import { wrapPaginatedWithSummary, wrapSuccess } from '../../core/openapi/envelopes';
import {
  CurrentPeriodSummarySchema,
  MonthlySummaryItemSchema,
  SubscriptionCandidateSchema,
  TransactionListSummarySchema,
  TransactionSchema,
  TransactionSummarySchema,
} from '../../core/openapi/schemas';
import { created, nullData, ok, route } from '../../core/openapi/route';
import { idParamSchema } from '../../core/schemas/id-param.schema';
import { transactionSchema, transactionUpdateSchema } from './schemas/transaction.schema';

const intQuery = z.coerce.number().int().positive().optional();
const dateQuery = z.string().optional();

const transactionTypeQuery = z.enum(['income', 'expense']).optional();
const exportQuery = z.object({
  startDate: dateQuery,
  endDate: dateQuery,
  periodId: z.string().uuid().optional(),
  type: transactionTypeQuery,
});
const transactionsListQuery = z.object({
  category: z.string().optional(),
  startDate: dateQuery,
  endDate: dateQuery,
  periodId: z.string().uuid().optional(),
  type: transactionTypeQuery,
  page: intQuery,
  limit: intQuery,
});

route({
  method: 'post',
  path: '/transactions/create',
  tag: 'Transactions',
  summary: 'Criar transação',
  body: transactionSchema,
  ok: created(wrapSuccess(TransactionSchema)),
});
route({
  method: 'get',
  path: '/transactions/',
  tag: 'Transactions',
  summary: 'Listar transações (paginado)',
  query: transactionsListQuery,
  ok: ok(wrapPaginatedWithSummary(TransactionSchema, TransactionListSummarySchema)),
});
route({
  method: 'put',
  path: '/transactions/{id}',
  tag: 'Transactions',
  summary: 'Atualizar transação',
  body: transactionUpdateSchema,
  params: idParamSchema,
  ok: ok(wrapSuccess(TransactionSchema)),
});
route({
  method: 'delete',
  path: '/transactions/{id}',
  tag: 'Transactions',
  summary: 'Deletar transação',
  params: idParamSchema,
  ok: ok(nullData),
});
route({
  method: 'get',
  path: '/transactions/summary',
  tag: 'Transactions',
  summary: 'Resumo financeiro',
  ok: ok(wrapSuccess(TransactionSummarySchema)),
});
route({
  method: 'get',
  path: '/transactions/summary-by-month',
  tag: 'Transactions',
  summary: 'Resumo agregado por mês',
  ok: ok(wrapSuccess(z.array(MonthlySummaryItemSchema))),
});
route({
  method: 'get',
  path: '/transactions/summary-current-period',
  tag: 'Transactions',
  summary: 'Resumo do período atual',
  ok: ok(wrapSuccess(CurrentPeriodSummarySchema)),
});
route({
  method: 'get',
  path: '/transactions/export',
  tag: 'Transactions',
  summary: 'Exportar transações em CSV',
  query: exportQuery,
  csv: true,
});
route({
  method: 'get',
  path: '/transactions/subscriptions',
  tag: 'Transactions',
  summary: 'Detectar assinaturas (heurística)',
  ok: ok(wrapSuccess(z.array(SubscriptionCandidateSchema))),
});
