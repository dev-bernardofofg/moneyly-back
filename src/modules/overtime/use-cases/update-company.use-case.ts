import { HttpError } from '../../../core/errors/http-error';
import { companyRepository } from '../repositories/company.repository';
import { validateActiveCompany } from '../validations/company.validation';
import type { UpdateCompanyInput } from '../schemas/company.schema';

export const updateCompanyUseCase = async (
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
