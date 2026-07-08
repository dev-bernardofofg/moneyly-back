import { companyRepository } from '../repositories/company.repository';
import type { ICompanyRepository } from '../repositories/interfaces/ICompanyRepository';
import { NotFoundError } from './errors';
import { validateActiveCompany } from '../validations/company.validation';
import type { CreateCompanyInput, UpdateCompanyInput } from '../schemas/company.schema';

export interface CompanyServiceDeps {
  companyRepository: Pick<ICompanyRepository, 'create' | 'findByUserId' | 'update' | 'softDelete'>;
  validateActiveCompany: typeof validateActiveCompany;
}

export const makeCompanyService = (deps: CompanyServiceDeps) => {
  const { companyRepository, validateActiveCompany } = deps;

  const create = async (userId: string, data: CreateCompanyInput) => {
    return companyRepository.create({
      userId,
      name: data.name,
      hourlyRate: data.hourlyRate.toString(),
      isActive: true,
    });
  };

  const getCompanies = async (userId: string) => {
    return companyRepository.findByUserId(userId);
  };

  const update = async (id: string, userId: string, data: UpdateCompanyInput) => {
    await validateActiveCompany(id, userId);

    const updated = await companyRepository.update(id, userId, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate.toString() }),
    });
    if (!updated) throw new NotFoundError('Empresa não encontrada');
    return updated;
  };

  const remove = async (id: string, userId: string) => {
    await validateActiveCompany(id, userId);
    const deleted = await companyRepository.softDelete(id, userId);
    if (!deleted) throw new NotFoundError('Empresa não encontrada');
    return deleted;
  };

  return { create, getCompanies, update, delete: remove };
};

// Composition root: instância default com os singletons reais.
export const companyService = makeCompanyService({
  companyRepository,
  validateActiveCompany,
});
