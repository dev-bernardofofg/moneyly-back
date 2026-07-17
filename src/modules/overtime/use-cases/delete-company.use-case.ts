import { HttpError } from '../../../core/errors/http-error';
import { companyRepository } from '../repositories/company.repository';
import { validateActiveCompany } from '../validations/company.validation';

export const deleteCompanyUseCase = async (id: string, userId: string) => {
  await validateActiveCompany(id, userId);
  const deleted = await companyRepository.softDelete(id, userId);
  if (!deleted) throw new HttpError(404, 'Empresa não encontrada');
  return deleted;
};
