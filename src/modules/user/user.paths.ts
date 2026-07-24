/**
 * Registro OpenAPI do módulo user (importado por core/openapi/generate).
 */
import { z } from '@core/openapi/registry';
import { wrapSuccess } from '@core/openapi/envelopes';
import {
  FinancialPeriodSchema,
  FinancialPeriodSummarySchema,
  FinancialPeriodUpdateSchema,
  IncomeAndPeriodUpdateSchema,
  IncomeUpdateSchema,
  UserSchema,
} from '@core/openapi/schemas';
import { ok, route } from '@core/openapi/route';
import {
  updateFinancialPeriodSchema,
  updateIncomeAndPeriodSchema,
  updateMonthlyIncomeSchema,
} from './schemas/user.schema';

const periodIdParam = z.object({ periodId: z.string().uuid() });

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
