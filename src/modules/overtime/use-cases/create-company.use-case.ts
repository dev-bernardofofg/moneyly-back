import { companyRepository } from '../repositories/company.repository';
import type { CreateCompanyInput } from '../schemas/company.schema';

export const createCompanyUseCase = async (userId: string, data: CreateCompanyInput) => {
  return companyRepository.create({
    userId,
    name: data.name,
    hourlyRate: data.hourlyRate.toString(),
    isActive: true,
  });
};
