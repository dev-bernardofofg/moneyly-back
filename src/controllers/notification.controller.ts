import type { NextFunction, Response } from "express";
import { isHttpError } from "../helpers/errors";
import { ResponseHandler } from "../helpers/response-handler";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  listNotificationsService,
  markAllNotificationsReadService,
  markNotificationReadService,
} from "../services/notification.service";

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const { unreadOnly, page, limit } = req.query as {
      unreadOnly?: boolean;
      page?: number;
      limit?: number;
    };
    const result = await listNotificationsService(
      req.user.id,
      { page, limit },
      Boolean(unreadOnly)
    );
    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      "Notificações recuperadas com sucesso"
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao buscar notificações", error);
  }
};

export const markNotificationRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, "ID da notificação é obrigatório");

  try {
    const notification = await markNotificationReadService(id, req.user.id);
    return ResponseHandler.success(res, notification, "Notificação marcada como lida");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao marcar notificação como lida", error);
  }
};

export const markAllNotificationsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const result = await markAllNotificationsReadService(req.user.id);
    return ResponseHandler.success(res, result, "Notificações marcadas como lidas");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao marcar notificações como lidas", error);
  }
};
