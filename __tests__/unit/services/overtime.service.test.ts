/**
 * Unit tests for the overtime service (factory with injected dependencies).
 */

import {
  makeOvertimeService,
  type OvertimeServiceDeps,
} from '../../../src/services/overtime.service';

const USER = 'user-123';

const company = { id: 'comp-1', name: 'ACME', hourlyRate: '50' };

const buildDeps = () => {
  const deps = {
    overtimeRepository: {
      create: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdPaginated: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getSummary: jest.fn(),
      setTransactionId: jest.fn(),
    },
    categoryRepository: {
      findByIdAndUserId: jest.fn(),
      findGlobalCategories: jest.fn(),
    },
    transactionRepository: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    financialPeriodService: {
      findOrCreatePeriodForDate: jest.fn().mockResolvedValue('p1'),
    },
    validations: {
      validateActiveCompany: jest.fn().mockResolvedValue(company),
      validateOvertimeOwnership: jest.fn(),
      validateTimeRange: jest.fn(),
    },
  };
  return deps as unknown as OvertimeServiceDeps & typeof deps;
};

describe('overtime service', () => {
  describe('create', () => {
    const input = {
      companyId: 'comp-1',
      startTime: '2026-03-10T18:00:00.000Z',
      endTime: '2026-03-10T20:00:00.000Z',
      description: 'Deploy noturno',
    };

    it('creates the record with computed hours/amount and links the income transaction', async () => {
      const deps = buildDeps();
      deps.categoryRepository.findGlobalCategories.mockResolvedValue([
        { id: 'cat-sal', name: 'Salário' },
      ]);
      deps.overtimeRepository.create.mockResolvedValue({ id: 'ot-1', transactionId: null });
      deps.transactionRepository.create.mockResolvedValue({ id: 'tx-1' });

      const service = makeOvertimeService(deps);
      const result = await service.create(USER, input as never);

      // 2h * R$50 = R$100
      expect(deps.overtimeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER,
          companyId: 'comp-1',
          hoursWorked: '2',
          hourlyRateSnapshot: '50',
          amount: '100',
        })
      );
      expect(deps.transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          title: 'Hora extra — ACME',
          amount: '100',
          categoryId: 'cat-sal',
          overtimeRecordId: 'ot-1',
          periodId: 'p1',
        })
      );
      expect(deps.overtimeRepository.setTransactionId).toHaveBeenCalledWith('ot-1', 'tx-1');
      expect(result.transactionId).toBe('tx-1');
    });

    it('uses the provided category when it belongs to the user', async () => {
      const deps = buildDeps();
      deps.categoryRepository.findByIdAndUserId.mockResolvedValue({ id: 'cat-custom' });
      deps.overtimeRepository.create.mockResolvedValue({ id: 'ot-1' });
      deps.transactionRepository.create.mockResolvedValue({ id: 'tx-1' });

      const service = makeOvertimeService(deps);
      await service.create(USER, { ...input, categoryId: 'cat-custom' } as never);

      expect(deps.categoryRepository.findByIdAndUserId).toHaveBeenCalledWith('cat-custom', USER);
      expect(deps.transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-custom' })
      );
    });

    it('throws when the provided category does not belong to the user', async () => {
      const deps = buildDeps();
      deps.categoryRepository.findByIdAndUserId.mockResolvedValue(null);

      const service = makeOvertimeService(deps);

      await expect(
        service.create(USER, { ...input, categoryId: 'cat-alien' } as never)
      ).rejects.toThrow('Categoria não encontrada');
      expect(deps.overtimeRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const existing = {
      id: 'ot-1',
      companyId: 'comp-1',
      company: { id: 'comp-1', name: 'ACME' },
      startTime: new Date('2026-03-10T18:00:00.000Z'),
      endTime: new Date('2026-03-10T20:00:00.000Z'),
      transactionId: 'tx-1',
    };

    it('recalculates amount and syncs the linked transaction when times change', async () => {
      const deps = buildDeps();
      deps.validations.validateOvertimeOwnership.mockResolvedValue(existing);
      deps.overtimeRepository.update.mockResolvedValue({ id: 'ot-1' });

      const service = makeOvertimeService(deps);
      await service.update('ot-1', USER, {
        endTime: '2026-03-10T21:00:00.000Z',
      } as never);

      // 3h * R$50 = R$150
      expect(deps.overtimeRepository.update).toHaveBeenCalledWith(
        'ot-1',
        USER,
        expect.objectContaining({ hoursWorked: '3', amount: '150' })
      );
      expect(deps.transactionRepository.update).toHaveBeenCalledWith(
        'tx-1',
        USER,
        expect.objectContaining({ amount: '150', periodId: 'p1' })
      );
    });

    it('updates only the description without recalculating', async () => {
      const deps = buildDeps();
      deps.validations.validateOvertimeOwnership.mockResolvedValue(existing);
      deps.overtimeRepository.update.mockResolvedValue({ id: 'ot-1' });

      const service = makeOvertimeService(deps);
      await service.update('ot-1', USER, { description: 'Nova descrição' } as never);

      expect(deps.overtimeRepository.update).toHaveBeenCalledWith('ot-1', USER, {
        description: 'Nova descrição',
      });
      expect(deps.transactionRepository.update).toHaveBeenCalledWith('tx-1', USER, {
        description: 'Nova descrição',
      });
    });

    it('throws when the record vanishes on update', async () => {
      const deps = buildDeps();
      deps.validations.validateOvertimeOwnership.mockResolvedValue(existing);
      deps.overtimeRepository.update.mockResolvedValue(null);

      const service = makeOvertimeService(deps);

      await expect(service.update('ot-1', USER, { description: 'x' } as never)).rejects.toThrow(
        'Registro de hora extra não encontrado'
      );
    });
  });

  describe('delete', () => {
    it('deletes the linked transaction before deleting the record', async () => {
      const deps = buildDeps();
      deps.validations.validateOvertimeOwnership.mockResolvedValue({
        id: 'ot-1',
        transactionId: 'tx-1',
      });
      deps.overtimeRepository.delete.mockResolvedValue({ id: 'ot-1' });

      const service = makeOvertimeService(deps);
      const result = await service.delete('ot-1', USER);

      expect(deps.transactionRepository.delete).toHaveBeenCalledWith('tx-1', USER);
      expect(deps.overtimeRepository.delete).toHaveBeenCalledWith('ot-1', USER);
      expect(result).toEqual({ id: 'ot-1' });
    });

    it('skips transaction deletion when the record has no linked transaction', async () => {
      const deps = buildDeps();
      deps.validations.validateOvertimeOwnership.mockResolvedValue({
        id: 'ot-1',
        transactionId: null,
      });
      deps.overtimeRepository.delete.mockResolvedValue({ id: 'ot-1' });

      const service = makeOvertimeService(deps);
      await service.delete('ot-1', USER);

      expect(deps.transactionRepository.delete).not.toHaveBeenCalled();
    });
  });
});
