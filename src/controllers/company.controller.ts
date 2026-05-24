import { ResponseHandler } from '../helpers/response-handler';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import { BadRequestError } from '../services/errors';
import {
  createCompanyService,
  deleteCompanyService,
  getCompaniesService,
  updateCompanyService,
} from '../services/company.service';

export const createCompany = asyncHandler<AuthRequest>(async (req, res) => {
  const company = await createCompanyService(req.user.id, req.body);
  return ResponseHandler.created(res, company, 'Empresa criada com sucesso');
});

export const getCompanies = asyncHandler<AuthRequest>(async (req, res) => {
  const companies = await getCompaniesService(req.user.id);
  return ResponseHandler.success(res, companies, 'Empresas recuperadas com sucesso');
});

export const updateCompany = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da empresa não fornecido');

  const company = await updateCompanyService(id, req.user.id, req.body);
  return ResponseHandler.success(res, company, 'Empresa atualizada com sucesso');
});

export const deleteCompany = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da empresa não fornecido');

  await deleteCompanyService(id, req.user.id);
  return ResponseHandler.success(res, null, 'Empresa desativada com sucesso');
});
