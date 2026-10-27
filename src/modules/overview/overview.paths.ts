/**
 * Registro OpenAPI do módulo overview (importado por core/openapi/generate).
 */
import { z } from '@core/openapi/registry';
import { wrapSuccess } from '@core/openapi/envelopes';
import {
  DashboardOverviewSchema,
  FinancialPeriodSummarySchema,
  FinancialInsightsSchema,
  ForecastResponseSchema,
  CardBillsSchema,
  PlannerOverviewSchema,
} from '@core/openapi/schemas';
import { ok, route } from '@core/openapi/route';
import {
  getAvailablePeriodsQuerySchema,
  getDashboardOverviewQuerySchema,
  plannerQuerySchema,
} from './schemas/overview.schema';

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
  summary: 'Planejamento financeiro e impacto no Saldo Livre',
  query: plannerQuerySchema,
  ok: ok(wrapSuccess(PlannerOverviewSchema)),
});
route({
  method: 'get',
  path: '/overview/insights',
  tag: 'Overview',
  summary: 'Gastos do período por categoria e comparados aos períodos anteriores',
  query: z.object({ periodId: z.string().uuid().optional() }),
  ok: ok(wrapSuccess(FinancialInsightsSchema)),
});
route({
  method: 'get',
  path: '/overview/forecast',
  tag: 'Overview',
  summary: 'Saldo Livre e projeção do período',
  query: z.object({ periodId: z.string().uuid().optional() }),
  ok: ok(wrapSuccess(ForecastResponseSchema)),
});
route({
  method: 'get',
  path: '/overview/card-bills',
  tag: 'Overview',
  summary: 'Faturas de cartão que vencem no período, por categoria',
  query: z.object({ periodId: z.string().uuid().optional() }),
  ok: ok(wrapSuccess(CardBillsSchema)),
});
