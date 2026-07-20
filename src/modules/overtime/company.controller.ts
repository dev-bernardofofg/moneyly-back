import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import type { AuthRequest } from '@modules/auth/middlewares/auth';
import { BadRequestError } from '@core/errors';
import { createCompanyUseCase } from './use-cases/create-company.use-case';
import { deleteCompanyUseCase } from './use-cases/delete-company.use-case';
import { listCompaniesUseCase } from './use-cases/list-companies.use-case';
import { updateCompanyUseCase } from './use-cases/update-company.use-case';

export const createCompany = asyncHandler<AuthRequest>(async (req, res) => {
  const company = await createCompanyUseCase(req.user.id, req.body);
  return ResponseHandler.created(res, company, 'Empresa criada com sucesso');
});

export const getCompanies = asyncHandler<AuthRequest>(async (req, res) => {
  const companies = await listCompaniesUseCase(req.user.id);
  return ResponseHandler.success(res, companies, 'Empresas recuperadas com sucesso');
});

export const updateCompany = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da empresa não fornecido');

  const company = await updateCompanyUseCase(id, req.user.id, req.body);
  return ResponseHandler.success(res, company, 'Empresa atualizada com sucesso');
});

export const deleteCompany = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da empresa não fornecido');

  await deleteCompanyUseCase(id, req.user.id);
  return ResponseHandler.success(res, null, 'Empresa desativada com sucesso');
});
