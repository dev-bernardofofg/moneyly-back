import type { NextFunction, Response } from 'express';
import { isHttpError } from '../helpers/errors';
import { ResponseHandler } from '../helpers/response-handler';
import type { AuthenticatedRequest } from '../middlewares/auth';
import {
  createCompanyService,
  deleteCompanyService,
  getCompaniesService,
  updateCompanyService,
} from '../services/company.service';

export const createCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  try {
    const company = await createCompanyService(req.user.id, req.body);
    return ResponseHandler.created(res, company, 'Empresa criada com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível criar a empresa', error);
  }
};

export const getCompanies = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  try {
    const companies = await getCompaniesService(req.user.id);
    return ResponseHandler.success(res, companies, 'Empresas recuperadas com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível buscar as empresas', error);
  }
};

export const updateCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID da empresa não fornecido');
  try {
    const company = await updateCompanyService(id, req.user.id, req.body);
    return ResponseHandler.success(res, company, 'Empresa atualizada com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível atualizar a empresa', error);
  }
};

export const deleteCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, 'ID da empresa não fornecido');
  try {
    await deleteCompanyService(id, req.user.id);
    return ResponseHandler.success(res, null, 'Empresa desativada com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível desativar a empresa', error);
  }
};
