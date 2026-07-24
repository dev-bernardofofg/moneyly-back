import { companyRepository } from '../repositories/company.repository';

export const listCompaniesUseCase = async (userId: string) => {
  return companyRepository.findByUserId(userId);
};
