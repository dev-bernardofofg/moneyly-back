/**
 * Registro OpenAPI do módulo notification (importado por core/openapi/generate).
 */
import { z } from '../../core/openapi/registry';
import { wrapPaginated, wrapSuccess } from '../../core/openapi/envelopes';
import { NotificationSchema } from '../../core/openapi/schemas';
import { ok, route } from '../../core/openapi/route';
import { idParamSchema } from '../../core/schemas/id-param.schema';

const intQuery = z.coerce.number().int().positive().optional();
const notificationsQuery = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  page: intQuery,
  limit: intQuery,
});

route({
  method: 'get',
  path: '/notifications/',
  tag: 'Notifications',
  summary: 'Listar notificações (paginado)',
  query: notificationsQuery,
  ok: ok(wrapPaginated(NotificationSchema)),
});
route({
  method: 'patch',
  path: '/notifications/read-all',
  tag: 'Notifications',
  summary: 'Marcar todas como lidas',
  ok: ok(wrapSuccess(z.object({ updatedCount: z.number().int() }))),
});
route({
  method: 'patch',
  path: '/notifications/{id}/read',
  tag: 'Notifications',
  summary: 'Marcar notificação como lida',
  params: idParamSchema,
  ok: ok(wrapSuccess(NotificationSchema)),
});
