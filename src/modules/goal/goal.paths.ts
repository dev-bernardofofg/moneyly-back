/**
 * Registro OpenAPI do módulo goal (importado por core/openapi/generate).
 */
import { z } from '@core/openapi/registry';
import { wrapSuccess } from '@core/openapi/envelopes';
import { GoalSchema } from '@core/openapi/schemas';
import { created, nullData, ok, route } from '@core/openapi/route';
import { idParamSchema } from '@core/schemas/id-param.schema';
import {
  addAmountToGoalSchema,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
} from './schemas/goal.schema';

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
