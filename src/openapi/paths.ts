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
import { registry, z } from "./registry";
import {
  errorResponse,
  wrapPaginated,
  wrapPaginatedWithSummary,
  wrapSuccess,
} from "./envelopes";
import {
  AuthRefreshSchema,
  AuthSessionSchema,
  BudgetProgressSchema,
  BudgetSchema,
  CategorySchema,
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
  PlannerOverviewSchema,
  RecurringTransactionSchema,
  TransactionListSummarySchema,
  TransactionSchema,
  UserSchema,
} from "./schemas";

import {
  createUserSchema,
  googleAuthSchema,
  loginSchema,
  refreshTokenSchema,
  idParamSchema,
} from "../schemas/auth.schema";
import {
  updateFinancialPeriodSchema,
  updateIncomeAndPeriodSchema,
  updateMonthlyIncomeSchema,
} from "../schemas/user.schema";
import {
  transactionSchema,
  transactionUpdateSchema,
} from "../schemas/transaction.schema";
import {
  createCategorySchema,
  updateCategorySchema,
  createCategoryBudgetSchema,
  updateCategoryBudgetSchema,
  getBudgetsQuerySchema,
} from "../schemas/category.schema";
import {
  addAmountToGoalSchema,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
} from "../schemas/goal.schema";
import {
  getAvailablePeriodsQuerySchema,
  getDashboardOverviewQuerySchema,
} from "../schemas/overview.schema";
import {
  recurringTransactionSchema,
  recurringTransactionUpdateSchema,
} from "../schemas/recurring-transaction.schema";

const json = (schema: z.ZodTypeAny) => ({
  content: { "application/json": { schema } },
});

const periodIdParam = z.object({ periodId: z.string().uuid() });
const intQuery = z.coerce.number().int().positive().optional();
const dateQuery = z.string().optional();

const exportQuery = z.object({ startDate: dateQuery, endDate: dateQuery });
const transactionsListQuery = z.object({
  category: z.string().optional(),
  startDate: dateQuery,
  endDate: dateQuery,
  page: intQuery,
  limit: intQuery,
});
const categoriesQuery = z.object({ page: intQuery, limit: intQuery });
const recurringListQuery = z.object({
  includeInactive: z.coerce.boolean().optional(),
  page: intQuery,
  limit: intQuery,
});

type RouteOpts = {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  tag: string;
  summary: string;
  auth?: boolean; // default true
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.AnyZodObject;
  ok?: { status: 200 | 201; schema: z.ZodTypeAny };
  csv?: boolean;
};

function route(o: RouteOpts) {
  const auth = o.auth !== false;
  const ok = o.ok ?? { status: 200 as const, schema: wrapSuccess() };

  const responses: Record<string, unknown> = {
    [ok.status]: {
      description: "Sucesso",
      ...(o.csv
        ? { content: { "text/csv": { schema: z.string() } } }
        : json(ok.schema)),
    },
    400: { description: "Requisição inválida", ...json(errorResponse) },
  };
  if (auth) {
    responses[401] = { description: "Não autenticado", ...json(errorResponse) };
  }
  if (o.params) {
    responses[404] = {
      description: "Recurso não encontrado",
      ...json(errorResponse),
    };
  }

  registry.registerPath({
    method: o.method,
    path: o.path,
    tags: [o.tag],
    summary: o.summary,
    ...(auth ? { security: [{ bearerAuth: [] }] } : { security: [] }),
    request: {
      ...(o.body ? { body: json(o.body) } : {}),
      ...(o.query ? { query: o.query as z.AnyZodObject } : {}),
      ...(o.params ? { params: o.params } : {}),
    },
    responses: responses as never,
  });
}

const ok = (schema: z.ZodTypeAny) => ({ status: 200 as const, schema });
const created = (schema: z.ZodTypeAny = wrapSuccess()) => ({
  status: 201 as const,
  schema,
});
const nullData = wrapSuccess(z.null());

/* ───────────────────────── health ───────────────────────── */
route({
  method: "get",
  path: "/health",
  tag: "Health",
  summary: "Healthcheck",
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
route({ method: "post", path: "/auth/sign-up", tag: "Auth", summary: "Cadastro de usuário", auth: false, body: createUserSchema, ok: created(wrapSuccess(AuthSessionSchema)) });
route({ method: "post", path: "/auth/sign-in", tag: "Auth", summary: "Login", auth: false, body: loginSchema, ok: ok(wrapSuccess(AuthSessionSchema)) });
route({ method: "post", path: "/auth/google", tag: "Auth", summary: "Login com Google", auth: false, body: googleAuthSchema, ok: ok(wrapSuccess(AuthSessionSchema)) });
route({ method: "post", path: "/auth/refresh", tag: "Auth", summary: "Renovar access token", auth: false, body: refreshTokenSchema, ok: ok(wrapSuccess(AuthRefreshSchema)) });
route({ method: "post", path: "/auth/logout", tag: "Auth", summary: "Logout (revoga refresh token)", body: refreshTokenSchema, ok: ok(wrapSuccess(z.object({ success: z.boolean() }))) });

/* ───────────────────────── user ───────────────────────── */
route({ method: "get", path: "/user/me", tag: "User", summary: "Perfil do usuário autenticado", ok: ok(wrapSuccess(UserSchema)) });
route({ method: "put", path: "/user/income", tag: "User", summary: "Atualizar renda mensal", body: updateMonthlyIncomeSchema, ok: ok(wrapSuccess(IncomeUpdateSchema)) });
route({ method: "put", path: "/user/financial-period", tag: "User", summary: "Atualizar período financeiro", body: updateFinancialPeriodSchema, ok: ok(wrapSuccess(FinancialPeriodUpdateSchema)) });
route({ method: "put", path: "/user/income-and-period", tag: "User", summary: "Atualizar renda + período", body: updateIncomeAndPeriodSchema, ok: ok(wrapSuccess(IncomeAndPeriodUpdateSchema)) });
route({ method: "get", path: "/user/financial-periods", tag: "User", summary: "Listar períodos financeiros", ok: ok(wrapSuccess(z.array(FinancialPeriodSummarySchema))) });
route({ method: "get", path: "/user/financial-periods/{periodId}", tag: "User", summary: "Buscar período por ID", params: periodIdParam, ok: ok(wrapSuccess(FinancialPeriodSchema)) });

/* ───────────────────────── transactions ───────────────────────── */
route({ method: "post", path: "/transactions/create", tag: "Transactions", summary: "Criar transação", body: transactionSchema, ok: created(wrapSuccess(TransactionSchema)) });
route({ method: "get", path: "/transactions/", tag: "Transactions", summary: "Listar transações (paginado)", query: transactionsListQuery, ok: ok(wrapPaginatedWithSummary(TransactionSchema, TransactionListSummarySchema)) });
route({ method: "put", path: "/transactions/{id}", tag: "Transactions", summary: "Atualizar transação", body: transactionUpdateSchema, params: idParamSchema, ok: ok(wrapSuccess(TransactionSchema)) });
route({ method: "delete", path: "/transactions/{id}", tag: "Transactions", summary: "Deletar transação", params: idParamSchema, ok: ok(nullData) });
route({ method: "get", path: "/transactions/summary", tag: "Transactions", summary: "Resumo financeiro" });
route({ method: "get", path: "/transactions/summary-by-month", tag: "Transactions", summary: "Resumo agregado por mês", ok: ok(wrapSuccess(z.array(MonthlySummaryItemSchema))) });
route({ method: "get", path: "/transactions/summary-current-period", tag: "Transactions", summary: "Resumo do período atual" });
route({ method: "get", path: "/transactions/export", tag: "Transactions", summary: "Exportar transações em CSV", query: exportQuery, csv: true });

/* ───────────────────────── categories ───────────────────────── */
route({ method: "post", path: "/categories/create", tag: "Categories", summary: "Criar categoria", body: createCategorySchema, ok: created(wrapSuccess(CategorySchema)) });
route({ method: "get", path: "/categories/", tag: "Categories", summary: "Listar categorias", query: categoriesQuery, ok: ok(wrapSuccess(z.array(CategorySchema))) });
route({ method: "put", path: "/categories/update/{id}", tag: "Categories", summary: "Atualizar categoria", body: updateCategorySchema, params: idParamSchema, ok: ok(wrapSuccess(CategorySchema)) });
route({ method: "delete", path: "/categories/delete/{id}", tag: "Categories", summary: "Deletar categoria", params: idParamSchema, ok: ok(nullData) });

/* ───────────────────────── budgets ───────────────────────── */
route({ method: "post", path: "/budgets/", tag: "Budgets", summary: "Criar orçamento por categoria", body: createCategoryBudgetSchema, ok: created(wrapSuccess(BudgetSchema)) });
route({ method: "get", path: "/budgets/", tag: "Budgets", summary: "Listar orçamentos com progresso", query: getBudgetsQuerySchema, ok: ok(wrapSuccess(z.array(BudgetProgressSchema))) });
route({ method: "put", path: "/budgets/{id}", tag: "Budgets", summary: "Atualizar orçamento", body: updateCategoryBudgetSchema, params: idParamSchema, ok: ok(wrapSuccess(BudgetSchema)) });
route({ method: "delete", path: "/budgets/{id}", tag: "Budgets", summary: "Deletar orçamento", params: idParamSchema, ok: ok(nullData) });

/* ───────────────────────── goals ───────────────────────── */
route({ method: "post", path: "/goals/", tag: "Goals", summary: "Criar meta de poupança", body: createSavingsGoalSchema, ok: created(wrapSuccess(GoalSchema)) });
route({ method: "get", path: "/goals/", tag: "Goals", summary: "Listar metas", ok: ok(wrapSuccess(z.array(GoalSchema))) });
route({ method: "get", path: "/goals/{id}", tag: "Goals", summary: "Detalhe da meta", params: idParamSchema, ok: ok(wrapSuccess(GoalSchema)) });
route({ method: "put", path: "/goals/{id}", tag: "Goals", summary: "Atualizar meta", body: updateSavingsGoalSchema, params: idParamSchema, ok: ok(wrapSuccess(GoalSchema)) });
route({ method: "post", path: "/goals/{id}/add-amount", tag: "Goals", summary: "Adicionar valor à meta", body: addAmountToGoalSchema, params: idParamSchema, ok: ok(wrapSuccess(GoalSchema)) });
route({ method: "delete", path: "/goals/{id}", tag: "Goals", summary: "Deletar meta", params: idParamSchema, ok: ok(nullData) });

/* ───────────────────────── overview ───────────────────────── */
route({ method: "get", path: "/overview/periods", tag: "Overview", summary: "Períodos financeiros disponíveis", query: getAvailablePeriodsQuerySchema, ok: ok(wrapSuccess(z.array(FinancialPeriodSummarySchema))) });
route({ method: "get", path: "/overview/dashboard", tag: "Overview", summary: "Dados do dashboard", query: getDashboardOverviewQuerySchema, ok: ok(wrapSuccess(DashboardOverviewSchema)) });
route({ method: "get", path: "/overview/planner", tag: "Overview", summary: "Planejamento financeiro", ok: ok(wrapSuccess(PlannerOverviewSchema)) });
route({ method: "get", path: "/overview/insights", tag: "Overview", summary: "Insights financeiros", ok: ok(wrapSuccess(FinancialInsightsSchema)) });
route({ method: "get", path: "/overview/forecast", tag: "Overview", summary: "Saldo projetado (cash-flow forecast)", query: z.object({ periodId: z.string().uuid().optional() }), ok: ok(wrapSuccess(ForecastResponseSchema)) });

/* ───────────────────────── recurring-transactions ───────────────────────── */
route({ method: "post", path: "/recurring-transactions/", tag: "RecurringTransactions", summary: "Criar transação recorrente", body: recurringTransactionSchema, ok: created(wrapSuccess(RecurringTransactionSchema)) });
route({ method: "get", path: "/recurring-transactions/", tag: "RecurringTransactions", summary: "Listar recorrentes (paginado)", query: recurringListQuery, ok: ok(wrapPaginated(RecurringTransactionSchema)) });
route({ method: "put", path: "/recurring-transactions/{id}", tag: "RecurringTransactions", summary: "Atualizar recorrente", body: recurringTransactionUpdateSchema, params: idParamSchema, ok: ok(wrapSuccess(RecurringTransactionSchema)) });
route({ method: "get", path: "/recurring-transactions/{id}/transactions", tag: "RecurringTransactions", summary: "Histórico de execuções", params: idParamSchema, ok: ok(wrapSuccess(z.array(TransactionSchema))) });
route({ method: "patch", path: "/recurring-transactions/{id}/reactivate", tag: "RecurringTransactions", summary: "Reativar recorrente", params: idParamSchema, ok: ok(wrapSuccess(RecurringTransactionSchema)) });
route({ method: "patch", path: "/recurring-transactions/{id}/deactivate", tag: "RecurringTransactions", summary: "Desativar recorrente", params: idParamSchema, ok: ok(nullData) });
route({ method: "delete", path: "/recurring-transactions/{id}", tag: "RecurringTransactions", summary: "Deletar recorrente", params: idParamSchema, ok: ok(nullData) });
