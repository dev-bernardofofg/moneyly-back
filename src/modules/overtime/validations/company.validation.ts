import { HttpError } from '@core/errors/http-error';
import { companyRepository } from '../repositories/company.repository';
import type { Company } from '@infra/db/schema';

export async function validateCompanyOwnership(id: string, userId: string): Promise<Company> {
  const company = await companyRepository.findByIdAndUserId(id, userId);
  if (!company) throw new HttpError(404, 'Empresa não encontrada');
  return company;
}

export async function validateActiveCompany(id: string, userId: string): Promise<Company> {
  const company = await validateCompanyOwnership(id, userId);
  if (!company.isActive) throw new HttpError(404, 'Empresa não encontrada');
  return company;
}
