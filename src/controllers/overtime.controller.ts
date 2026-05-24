import type { NextFunction, Response } from 'express';
import { isHttpError } from '../helpers/errors';
import { ResponseHandler } from '../helpers/response-handler';
import type { AuthenticatedRequest } from '../middlewares/auth';
import {
  createOvertimeService,
  deleteOvertimeService,
  getOvertimeService,
  getOvertimeSummaryService,
  updateOvertimeService,
} from '../services/overtime.service';

export const createOvertime = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  try {
    const record = await createOvertimeService(req.user.id, req.body);
    return ResponseHandler.created(res, record, 'Registro de hora extra criado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível criar o registro de hora extra', error);
  }
};

export const getOvertime = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  try {
    const { month, year, companyId } = req.query as {
      month?: string;
      year?: string;
      companyId?: string;
    };
    const records = await getOvertimeService(req.user.id, {
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      companyId,
    });
    return ResponseHandler.success(res, records, 'Registros recuperados com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível buscar os registros', error);
  }
};

export const getOvertimeSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  try {
    const { month, year } = req.query as { month: string; year: string };
    const summary = await getOvertimeSummaryService(req.user.id, Number(month), Number(year));
    return ResponseHandler.success(res, summary, 'Resumo recuperado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível buscar o resumo', error);
  }
};

export const updateOvertime = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID do registro não fornecido');
  try {
    const record = await updateOvertimeService(id, req.user.id, req.body);
    return ResponseHandler.success(res, record, 'Registro atualizado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível atualizar o registro', error);
  }
};

export const deleteOvertime = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID do registro não fornecido');
  try {
    await deleteOvertimeService(id, req.user.id);
    return ResponseHandler.success(res, null, 'Registro deletado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível deletar o registro', error);
  }
};
