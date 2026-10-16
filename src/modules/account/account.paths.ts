/**
 * Registro OpenAPI do módulo account (importado por core/openapi/generate).
 */
import { z } from '@core/openapi/registry';
import { wrapSuccess } from '@core/openapi/envelopes';
import { AccountSchema } from '@core/openapi/schemas';
import { created, nullData, ok, route } from '@core/openapi/route';
import { idParamSchema } from '@core/schemas/id-param.schema';
import { createAccountSchema, updateAccountSchema } from './schemas/account.schema';

route({
  method: 'get',
  path: '/accounts/',
  tag: 'Accounts',
  summary: 'Listar contas e cartões ativos (cria a conta padrão se faltar)',
  ok: ok(wrapSuccess(z.array(AccountSchema))),
});
route({
  method: 'post',
  path: '/accounts/',
  tag: 'Accounts',
  summary: 'Criar conta ou cartão',
  body: createAccountSchema,
  ok: created(wrapSuccess(AccountSchema)),
});
route({
  method: 'put',
  path: '/accounts/{id}',
  tag: 'Accounts',
  summary: 'Atualizar conta ou cartão',
  params: idParamSchema,
  body: updateAccountSchema,
  ok: ok(wrapSuccess(AccountSchema)),
});
route({
  method: 'delete',
  path: '/accounts/{id}',
  tag: 'Accounts',
  summary: 'Remover conta ou cartão (soft delete; a padrão não pode)',
  params: idParamSchema,
  ok: ok(nullData),
});
