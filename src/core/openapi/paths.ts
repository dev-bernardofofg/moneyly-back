/**
 * Registro central de endpoints (Express é manual, sem decorators).
 * 1 lugar só, revisável. O teste de regressão router↔openapi garante completude.
 *
 * - REQUEST: reusa schemas Zod reais de src/schemas/ (zero duplicação de validação).
 * - RESPONSE: schemas nomeados de ./schemas (viram components.schemas + $ref em data).
 * - QUERY page/limit: contrato = integer (number). Runtime (middleware validate)
 *   continua tolerante a string — schemas de src/schemas/ inalterados.
 *   Decisão registrada em moneyly/.specs/03-feature-roadmap.md.
 */
import { z } from './registry';
import { wrapPaginated, wrapPaginatedWithSummary, wrapSuccess } from './envelopes';
import {
  ComparativeInsightsSchema,
  DashboardOverviewSchema,
  FinancialPeriodSummarySchema,
  FinancialInsightsSchema,
  ForecastResponseSchema,
  MonthlySummaryItemSchema,
  SubscriptionCandidateSchema,
  PlannerOverviewSchema,
  CurrentPeriodSummarySchema,
  RecurringTransactionSchema,
  TransactionListSummarySchema,
  TransactionSummarySchema,
  TransactionSchema,
} from './schemas';

import { idParamSchema } from '../schemas/id-param.schema';
import { transactionSchema, transactionUpdateSchema } from '../../schemas/transaction.schema';
import {
  getAvailablePeriodsQuerySchema,
  getDashboardOverviewQuerySchema,
} from '../../schemas/overview.schema';
import {
  fromSubscriptionSchema,
  recurringTransactionSchema,
  recurringTransactionUpdateSchema,
} from '../../schemas/recurring-transaction.schema';

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
const recurringListQuery = z.object({
  includeInactive: z.coerce.boolean().optional(),
  page: intQuery,
  limit: intQuery,
});
import { created, nullData, ok, route } from './route';

/* ───────────────────────── health ───────────────────────── */
route({
  method: 'get',
  path: '/health',
  tag: 'Health',
  summary: 'Healthcheck',
  auth: false,
  ok: ok(
    z.object({
      status: z.string(),
      message: z.string(),
      timestamp: z.string(),
      environment: z.string(),
    })
  ),
});

/* ───────────────────────── transactions ───────────────────────── */
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

/* ───────────────────────── overview ───────────────────────── */
route({
  method: 'get',
  path: '/overview/periods',
  tag: 'Overview',
  summary: 'Períodos financeiros disponíveis',
  query: getAvailablePeriodsQuerySchema,
  ok: ok(wrapSuccess(z.array(FinancialPeriodSummarySchema))),
});
route({
  method: 'get',
  path: '/overview/dashboard',
  tag: 'Overview',
  summary: 'Dados do dashboard',
  query: getDashboardOverviewQuerySchema,
  ok: ok(wrapSuccess(DashboardOverviewSchema)),
});
route({
  method: 'get',
  path: '/overview/planner',
  tag: 'Overview',
  summary: 'Planejamento financeiro',
  ok: ok(wrapSuccess(PlannerOverviewSchema)),
});
route({
  method: 'get',
  path: '/overview/insights',
  tag: 'Overview',
  summary: 'Insights financeiros',
  ok: ok(wrapSuccess(FinancialInsightsSchema)),
});
route({
  method: 'get',
  path: '/overview/forecast',
  tag: 'Overview',
  summary: 'Saldo projetado (cash-flow forecast)',
  query: z.object({ periodId: z.string().uuid().optional() }),
  ok: ok(wrapSuccess(ForecastResponseSchema)),
});
route({
  method: 'get',
  path: '/overview/insights/comparison',
  tag: 'Overview',
  summary: 'Insights comparativos (período atual vs média)',
  query: z.object({ periodsBack: z.coerce.number().int().min(1).max(12).optional() }),
  ok: ok(wrapSuccess(ComparativeInsightsSchema)),
});

/* ───────────────────────── recurring-transactions ───────────────────────── */
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
