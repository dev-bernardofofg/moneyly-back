/**
 * Registro OpenAPI do módulo budget (importado por core/openapi/generate).
 */
import { z } from '../../core/openapi/registry';
import { wrapSuccess } from '../../core/openapi/envelopes';
import { BudgetProgressSchema, BudgetSchema } from '../../core/openapi/schemas';
import { created, nullData, ok, route } from '../../core/openapi/route';
import { idParamSchema } from '../../core/schemas/id-param.schema';
import {
  createCategoryBudgetSchema,
  getBudgetsQuerySchema,
  updateCategoryBudgetSchema,
} from './schemas/budget.schema';

route({
  method: 'post',
  path: '/budgets/',
  tag: 'Budgets',
  summary: 'Criar orçamento por categoria',
  body: createCategoryBudgetSchema,
  ok: created(wrapSuccess(BudgetSchema)),
});
route({
  method: 'get',
  path: '/budgets/',
  tag: 'Budgets',
  summary: 'Listar orçamentos com progresso',
  query: getBudgetsQuerySchema,
  ok: ok(wrapSuccess(z.array(BudgetProgressSchema))),
});
route({
  method: 'put',
  path: '/budgets/{id}',
  tag: 'Budgets',
  summary: 'Atualizar orçamento',
  body: updateCategoryBudgetSchema,
  params: idParamSchema,
  ok: ok(wrapSuccess(BudgetSchema)),
});
route({
  method: 'delete',
  path: '/budgets/{id}',
  tag: 'Budgets',
  summary: 'Deletar orçamento',
  params: idParamSchema,
  ok: ok(nullData),
});
