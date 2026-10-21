/**
 * Registro OpenAPI do módulo transfer (importado por core/openapi/generate).
 */
import { z } from '@core/openapi/registry';
import { wrapSuccess } from '@core/openapi/envelopes';
import { TransferSchema } from '@core/openapi/schemas';
import { created, nullData, ok, route } from '@core/openapi/route';
import { idParamSchema } from '@core/schemas/id-param.schema';
import { createTransferSchema, listTransfersQuerySchema } from './schemas/transfer.schema';

route({
  method: 'get',
  path: '/transfers/',
  tag: 'Transfers',
  summary: 'Listar transferências do período (padrão: período atual)',
  query: listTransfersQuerySchema,
  ok: ok(wrapSuccess(z.array(TransferSchema))),
});
route({
  method: 'post',
  path: '/transfers/',
  tag: 'Transfers',
  summary: 'Registrar transferência entre contas correntes',
  body: createTransferSchema,
  ok: created(wrapSuccess(TransferSchema)),
});
route({
  method: 'delete',
  path: '/transfers/{id}',
  tag: 'Transfers',
  summary: 'Remover transferência',
  params: idParamSchema,
  ok: ok(nullData),
});
