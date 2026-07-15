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
  AuthRefreshSchema,
  AuthSessionSchema,
  CategorySchema,
  ComparativeInsightsSchema,
  FinancialPeriodUpdateSchema,
  IncomeAndPeriodUpdateSchema,
  IncomeUpdateSchema,
  DashboardOverviewSchema,
  FinancialInsightsSchema,
  FinancialPeriodSchema,
  FinancialPeriodSummarySchema,
  ForecastResponseSchema,
  GoalSchema,
  MonthlySummaryItemSchema,
  SubscriptionCandidateSchema,
  PlannerOverviewSchema,
  CurrentPeriodSummarySchema,
  RecurringTransactionSchema,
  TransactionListSummarySchema,
  TransactionSummarySchema,
  TransactionSchema,
  UserSchema,
} from './schemas';

import {
  createUserSchema,
  googleAuthSchema,
  loginSchema,
  refreshTokenSchema,
  idParamSchema,
} from '../../schemas/auth.schema';
import {
  updateFinancialPeriodSchema,
  updateIncomeAndPeriodSchema,
  updateMonthlyIncomeSchema,
} from '../../schemas/user.schema';
import { transactionSchema, transactionUpdateSchema } from '../../schemas/transaction.schema';
import { createCategorySchema, updateCategorySchema } from '../../schemas/category.schema';
import {
  addAmountToGoalSchema,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
} from '../../schemas/goal.schema';
import {
  getAvailablePeriodsQuerySchema,
  getDashboardOverviewQuerySchema,
} from '../../schemas/overview.schema';
import {
  fromSubscriptionSchema,
  recurringTransactionSchema,
  recurringTransactionUpdateSchema,
} from '../../schemas/recurring-transaction.schema';

const periodIdParam = z.object({ periodId: z.string().uuid() });
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
const categoriesQuery = z.object({ page: intQuery, limit: intQuery });
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

/* ───────────────────────── auth ───────────────────────── */
route({
  method: 'post',
  path: '/auth/sign-up',
  tag: 'Auth',
  summary: 'Cadastro de usuário',
  auth: false,
  body: createUserSchema,
  ok: created(wrapSuccess(AuthSessionSchema)),
});
route({
  method: 'post',
  path: '/auth/sign-in',
  tag: 'Auth',
  summary: 'Login',
  auth: false,
  body: loginSchema,
  ok: ok(wrapSuccess(AuthSessionSchema)),
});
route({
  method: 'post',
  path: '/auth/google',
  tag: 'Auth',
  summary: 'Login com Google',
  auth: false,
  body: googleAuthSchema,
  ok: ok(wrapSuccess(AuthSessionSchema)),
});
route({
  method: 'post',
  path: '/auth/refresh',
  tag: 'Auth',
  summary: 'Renovar access token',
  auth: false,
  body: refreshTokenSchema,
  ok: ok(wrapSuccess(AuthRefreshSchema)),
});
route({
  method: 'post',
  path: '/auth/logout',
  tag: 'Auth',
  summary: 'Logout (revoga refresh token)',
  body: refreshTokenSchema,
  ok: ok(wrapSuccess(z.object({ success: z.boolean() }))),
});

/* ───────────────────────── user ───────────────────────── */
route({
  method: 'get',
  path: '/user/me',
  tag: 'User',
  summary: 'Perfil do usuário autenticado',
  ok: ok(wrapSuccess(UserSchema)),
});
route({
  method: 'put',
  path: '/user/income',
  tag: 'User',
  summary: 'Atualizar renda mensal',
  body: updateMonthlyIncomeSchema,
  ok: ok(wrapSuccess(IncomeUpdateSchema)),
});
route({
  method: 'put',
  path: '/user/financial-period',
  tag: 'User',
  summary: 'Atualizar período financeiro',
  body: updateFinancialPeriodSchema,
  ok: ok(wrapSuccess(FinancialPeriodUpdateSchema)),
});
route({
  method: 'put',
  path: '/user/income-and-period',
  tag: 'User',
  summary: 'Atualizar renda + período',
  body: updateIncomeAndPeriodSchema,
  ok: ok(wrapSuccess(IncomeAndPeriodUpdateSchema)),
});
route({
  method: 'get',
  path: '/user/financial-periods',
  tag: 'User',
  summary: 'Listar períodos financeiros',
  ok: ok(wrapSuccess(z.array(FinancialPeriodSummarySchema))),
});
route({
  method: 'get',
  path: '/user/financial-periods/{periodId}',
  tag: 'User',
  summary: 'Buscar período por ID',
  params: periodIdParam,
  ok: ok(wrapSuccess(FinancialPeriodSchema)),
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

/* ───────────────────────── categories ───────────────────────── */
route({
  method: 'post',
  path: '/categories/create',
  tag: 'Categories',
  summary: 'Criar categoria',
  body: createCategorySchema,
  ok: created(wrapSuccess(CategorySchema)),
});
route({
  method: 'get',
  path: '/categories/',
  tag: 'Categories',
  summary: 'Listar categorias paginadas (params: page, limit)',
  query: categoriesQuery,
  ok: ok(wrapPaginated(CategorySchema)),
});
route({
  method: 'put',
  path: '/categories/update/{id}',
  tag: 'Categories',
  summary: 'Atualizar categoria',
  body: updateCategorySchema,
  params: idParamSchema,
  ok: ok(wrapSuccess(CategorySchema)),
});
route({
  method: 'delete',
  path: '/categories/delete/{id}',
  tag: 'Categories',
  summary: 'Deletar categoria',
  params: idParamSchema,
  ok: ok(nullData),
});

/* ───────────────────────── goals ───────────────────────── */
route({
  method: 'post',
  path: '/goals/',
  tag: 'Goals',
  summary: 'Criar meta de poupança',
  body: createSavingsGoalSchema,
  ok: created(wrapSuccess(GoalSchema)),
});
route({
  method: 'get',
  path: '/goals/',
  tag: 'Goals',
  summary: 'Listar metas',
  ok: ok(wrapSuccess(z.array(GoalSchema))),
});
route({
  method: 'get',
  path: '/goals/{id}',
  tag: 'Goals',
  summary: 'Detalhe da meta',
  params: idParamSchema,
  ok: ok(wrapSuccess(GoalSchema)),
});
route({
  method: 'put',
  path: '/goals/{id}',
  tag: 'Goals',
  summary: 'Atualizar meta',
  body: updateSavingsGoalSchema,
  params: idParamSchema,
  ok: ok(wrapSuccess(GoalSchema)),
});
route({
  method: 'post',
  path: '/goals/{id}/add-amount',
  tag: 'Goals',
  summary: 'Adicionar valor à meta',
  body: addAmountToGoalSchema,
  params: idParamSchema,
  ok: ok(wrapSuccess(GoalSchema)),
});
route({
  method: 'delete',
  path: '/goals/{id}',
  tag: 'Goals',
  summary: 'Deletar meta',
  params: idParamSchema,
  ok: ok(nullData),
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
