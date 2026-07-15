import { ResponseHandler } from '../core/helpers/response-handler';
import { asyncHandler } from '../core/middlewares/async-handler';
import type { AuthRequest } from '../core/middlewares/auth';
import { BadRequestError } from '../services/errors';
import {
  listNotificationsService,
  markAllNotificationsReadService,
  markNotificationReadService,
} from '../services/notification.service';

export const getNotifications = asyncHandler<AuthRequest>(async (req, res) => {
  const { page, limit } = req.query as {
    page?: number;
    limit?: number;
  };
  const unreadOnly = req.query.unreadOnly === 'true';
  const result = await listNotificationsService(req.user.id, { page, limit }, unreadOnly);
  return ResponseHandler.paginated(
    res,
    result.data,
    result.pagination,
    'Notificações recuperadas com sucesso'
  );
});

export const markNotificationRead = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da notificação é obrigatório');

  const notification = await markNotificationReadService(id, req.user.id);
  return ResponseHandler.success(res, notification, 'Notificação marcada como lida');
});

export const markAllNotificationsRead = asyncHandler<AuthRequest>(async (req, res) => {
  const result = await markAllNotificationsReadService(req.user.id);
  return ResponseHandler.success(res, result, 'Notificações marcadas como lidas');
});
