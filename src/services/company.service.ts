import { companyRepository } from '../repositories/company.repository';
import { HttpError } from '../validations/errors';
import { validateActiveCompany } from '../validations/company.validation';
import type { CreateCompanyInput, UpdateCompanyInput } from '../schemas/company.schema';

export const createCompanyService = async (userId: string, data: CreateCompanyInput) => {
  return companyRepository.create({
    userId,
    name: data.name,
    hourlyRate: data.hourlyRate.toString(),
    isActive: true,
  });
};

export const getCompaniesService = async (userId: string) => {
  return companyRepository.findByUserId(userId);
};

export const updateCompanyService = async (
  id: string,
  userId: string,
  data: UpdateCompanyInput
) => {
  await validateActiveCompany(id, userId);

  const updated = await companyRepository.update(id, userId, {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate.toString() }),
  });
  if (!updated) throw new HttpError(404, 'Empresa não encontrada');
  return updated;
};

export const deleteCompanyService = async (id: string, userId: string) => {
  await validateActiveCompany(id, userId);
  const deleted = await companyRepository.softDelete(id, userId);
  if (!deleted) throw new HttpError(404, 'Empresa não encontrada');
  return deleted;
};
