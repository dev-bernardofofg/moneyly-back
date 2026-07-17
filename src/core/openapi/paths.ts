/**
 * Endpoints legados (layer-first) ainda não migrados para módulos + health.
 * Módulos migrados registram os seus em src/modules/<x>/<x>.paths.ts
 * (importados por ./generate). Ao migrar um módulo, mover a seção daqui.
 */
import { z } from './registry';
import { wrapSuccess } from './envelopes';
import {
  ComparativeInsightsSchema,
  DashboardOverviewSchema,
  FinancialPeriodSummarySchema,
  FinancialInsightsSchema,
  ForecastResponseSchema,
  PlannerOverviewSchema,
} from './schemas';

import {
  getAvailablePeriodsQuerySchema,
  getDashboardOverviewQuerySchema,
} from '../../schemas/overview.schema';

import { ok, route } from './route';

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
