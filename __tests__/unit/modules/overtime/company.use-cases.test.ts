/**
 * Testes unitários para os use-cases de company (módulo overtime)
 */

import { companyRepository } from '@modules/overtime/repositories/company.repository';
import { createCompanyUseCase } from '@modules/overtime/use-cases/create-company.use-case';
import { deleteCompanyUseCase } from '@modules/overtime/use-cases/delete-company.use-case';
import { listCompaniesUseCase } from '@modules/overtime/use-cases/list-companies.use-case';
import { updateCompanyUseCase } from '@modules/overtime/use-cases/update-company.use-case';
import { validateActiveCompany } from '@modules/overtime/validations/company.validation';

// Mock dos módulos
jest.mock('@modules/overtime/repositories/company.repository');
jest.mock('@modules/overtime/validations/company.validation');

const USER = 'user-123';

describe('company use-cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCompanyUseCase', () => {
    it('creates a company with hourlyRate as string and active flag', async () => {
      (companyRepository.create as jest.Mock).mockResolvedValue({ id: 'comp-1' });

      const result = await createCompanyUseCase(USER, { name: 'ACME', hourlyRate: 62.5 });

      expect(companyRepository.create).toHaveBeenCalledWith({
        userId: USER,
        name: 'ACME',
        hourlyRate: '62.5',
        isActive: true,
      });
      expect(result).toEqual({ id: 'comp-1' });
    });
  });

  describe('listCompaniesUseCase', () => {
    it('lists user companies', async () => {
      (companyRepository.findByUserId as jest.Mock).mockResolvedValue([{ id: 'comp-1' }]);

      const result = await listCompaniesUseCase(USER);

      expect(companyRepository.findByUserId).toHaveBeenCalledWith(USER);
      expect(result).toEqual([{ id: 'comp-1' }]);
    });
  });

  describe('updateCompanyUseCase', () => {
    it('validates the company before updating and converts hourlyRate', async () => {
      (validateActiveCompany as jest.Mock).mockResolvedValue({ id: 'comp-1', isActive: true });
      (companyRepository.update as jest.Mock).mockResolvedValue({ id: 'comp-1' });

      const result = await updateCompanyUseCase('comp-1', USER, { hourlyRate: 80 });

      expect(validateActiveCompany).toHaveBeenCalledWith('comp-1', USER);
      expect(companyRepository.update).toHaveBeenCalledWith('comp-1', USER, {
        hourlyRate: '80',
      });
      expect(result).toEqual({ id: 'comp-1' });
    });

    it('throws when the company to update is not found', async () => {
      (validateActiveCompany as jest.Mock).mockResolvedValue({ id: 'comp-x', isActive: true });
      (companyRepository.update as jest.Mock).mockResolvedValue(null);

      await expect(updateCompanyUseCase('comp-x', USER, { name: 'X' })).rejects.toThrow(
        'Empresa não encontrada'
      );
    });
  });

  describe('deleteCompanyUseCase', () => {
    it('soft deletes after ownership validation', async () => {
      (validateActiveCompany as jest.Mock).mockResolvedValue({ id: 'comp-1', isActive: true });
      (companyRepository.softDelete as jest.Mock).mockResolvedValue({ id: 'comp-1' });

      const result = await deleteCompanyUseCase('comp-1', USER);

      expect(validateActiveCompany).toHaveBeenCalledWith('comp-1', USER);
      expect(companyRepository.softDelete).toHaveBeenCalledWith('comp-1', USER);
      expect(result).toEqual({ id: 'comp-1' });
    });
  });
});
