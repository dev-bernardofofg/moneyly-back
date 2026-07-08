/**
 * Unit tests for the company service (factory with injected dependencies).
 */

import { makeCompanyService, type CompanyServiceDeps } from '../../../src/services/company.service';

const USER = 'user-123';

const buildDeps = () => {
  const deps = {
    companyRepository: {
      create: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    },
    validateActiveCompany: jest.fn(),
  };
  return deps as unknown as CompanyServiceDeps & typeof deps;
};

describe('company service', () => {
  it('creates a company with hourlyRate as string and active flag', async () => {
    const deps = buildDeps();
    deps.companyRepository.create.mockResolvedValue({ id: 'comp-1' });

    const service = makeCompanyService(deps);
    const result = await service.create(USER, { name: 'ACME', hourlyRate: 62.5 } as never);

    expect(deps.companyRepository.create).toHaveBeenCalledWith({
      userId: USER,
      name: 'ACME',
      hourlyRate: '62.5',
      isActive: true,
    });
    expect(result).toEqual({ id: 'comp-1' });
  });

  it('lists user companies', async () => {
    const deps = buildDeps();
    deps.companyRepository.findByUserId.mockResolvedValue([{ id: 'comp-1' }]);

    const service = makeCompanyService(deps);
    const result = await service.getCompanies(USER);

    expect(deps.companyRepository.findByUserId).toHaveBeenCalledWith(USER);
    expect(result).toEqual([{ id: 'comp-1' }]);
  });

  it('validates the company before updating and converts hourlyRate', async () => {
    const deps = buildDeps();
    deps.companyRepository.update.mockResolvedValue({ id: 'comp-1' });

    const service = makeCompanyService(deps);
    await service.update('comp-1', USER, { hourlyRate: 80 } as never);

    expect(deps.validateActiveCompany).toHaveBeenCalledWith('comp-1', USER);
    expect(deps.companyRepository.update).toHaveBeenCalledWith('comp-1', USER, {
      hourlyRate: '80',
    });
  });

  it('throws when the company to update is not found', async () => {
    const deps = buildDeps();
    deps.companyRepository.update.mockResolvedValue(null);

    const service = makeCompanyService(deps);

    await expect(service.update('comp-x', USER, { name: 'X' } as never)).rejects.toThrow(
      'Empresa não encontrada'
    );
  });

  it('soft deletes after ownership validation', async () => {
    const deps = buildDeps();
    deps.companyRepository.softDelete.mockResolvedValue({ id: 'comp-1' });

    const service = makeCompanyService(deps);
    const result = await service.delete('comp-1', USER);

    expect(deps.validateActiveCompany).toHaveBeenCalledWith('comp-1', USER);
    expect(deps.companyRepository.softDelete).toHaveBeenCalledWith('comp-1', USER);
    expect(result).toEqual({ id: 'comp-1' });
  });
});
