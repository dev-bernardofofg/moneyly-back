/**
 * Testes unitários dos use-cases de hora extra (módulo overtime).
 *
 * Nota de contrato de datas: overtime usa hora REAL (startTime/endTime) — é a
 * exceção do contrato de meia-noite SP. As asserções abaixo verificam que os
 * instantes informados são persistidos sem normalização.
 */

import { overtimeRepository } from '@modules/overtime/repositories/overtime.repository';
import { createOvertimeUseCase } from '@modules/overtime/use-cases/create-overtime.use-case';
import { deleteOvertimeUseCase } from '@modules/overtime/use-cases/delete-overtime.use-case';
import { updateOvertimeUseCase } from '@modules/overtime/use-cases/update-overtime.use-case';
import { validateActiveCompany } from '@modules/overtime/validations/company.validation';
import { validateOvertimeOwnership } from '@modules/overtime/validations/overtime.validation';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { financialPeriodService } from '@modules/financial-period';
import { categoryRepository } from '@modules/category';

jest.mock('@modules/overtime/repositories/overtime.repository');
jest.mock('@modules/overtime/validations/company.validation');
jest.mock('@modules/overtime/validations/overtime.validation');
jest.mock('@modules/transaction/repositories/transaction.repository');
jest.mock('@modules/financial-period', () => ({
  financialPeriodService: {
    findOrCreatePeriodForDate: jest.fn(),
  },
}));
jest.mock('@modules/category', () => ({
  categoryRepository: {
    findByIdAndUserId: jest.fn(),
    findGlobalCategories: jest.fn(),
  },
}));

const mockedOvertimeRepo = overtimeRepository as jest.Mocked<typeof overtimeRepository>;
const mockedTransactionRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockedPeriodService = financialPeriodService as jest.Mocked<typeof financialPeriodService>;
const mockedCategoryRepo = categoryRepository as jest.Mocked<typeof categoryRepository>;
const mockedValidateActiveCompany = validateActiveCompany as jest.Mock;
const mockedValidateOwnership = validateOvertimeOwnership as jest.Mock;

const USER = 'user-123';

const company = { id: 'comp-1', name: 'ACME', hourlyRate: '50', isActive: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockedValidateActiveCompany.mockResolvedValue(company);
  (mockedPeriodService.findOrCreatePeriodForDate as jest.Mock).mockResolvedValue('p1');
});

describe('overtime use-cases', () => {
  describe('createOvertimeUseCase', () => {
    const input = {
      companyId: 'comp-1',
      startTime: '2026-03-10T18:00:00.000Z',
      endTime: '2026-03-10T20:00:00.000Z',
      description: 'Deploy noturno',
    };

    it('creates the record with computed hours/amount and links the income transaction', async () => {
      mockedCategoryRepo.findGlobalCategories.mockResolvedValue([
        { id: 'cat-sal', name: 'Salário' },
      ] as never);
      mockedOvertimeRepo.create.mockResolvedValue({ id: 'ot-1', transactionId: null } as never);
      mockedTransactionRepo.create.mockResolvedValue({ id: 'tx-1' } as never);

      const result = await createOvertimeUseCase(USER, input);

      // 2h * R$50 = R$100 — startTime/endTime preservados como instantes reais
      expect(mockedOvertimeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER,
          companyId: 'comp-1',
          startTime: new Date('2026-03-10T18:00:00.000Z'),
          endTime: new Date('2026-03-10T20:00:00.000Z'),
          hoursWorked: '2',
          hourlyRateSnapshot: '50',
          amount: '100',
          month: 3,
          year: 2026,
        })
      );
      expect(mockedPeriodService.findOrCreatePeriodForDate).toHaveBeenCalledWith(
        USER,
        new Date('2026-03-10T18:00:00.000Z')
      );
      expect(mockedTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          title: 'Hora extra — ACME',
          amount: '100',
          categoryId: 'cat-sal',
          date: new Date('2026-03-10T18:00:00.000Z'),
          overtimeRecordId: 'ot-1',
          periodId: 'p1',
        })
      );
      expect(mockedOvertimeRepo.setTransactionId).toHaveBeenCalledWith('ot-1', 'tx-1');
      expect(result.transactionId).toBe('tx-1');
    });

    it('uses the provided category when it belongs to the user', async () => {
      mockedCategoryRepo.findByIdAndUserId.mockResolvedValue({ id: 'cat-custom' } as never);
      mockedOvertimeRepo.create.mockResolvedValue({ id: 'ot-1' } as never);
      mockedTransactionRepo.create.mockResolvedValue({ id: 'tx-1' } as never);

      await createOvertimeUseCase(USER, { ...input, categoryId: 'cat-custom' });

      expect(mockedCategoryRepo.findByIdAndUserId).toHaveBeenCalledWith('cat-custom', USER);
      expect(mockedTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-custom' })
      );
    });

    it('throws when the provided category does not belong to the user', async () => {
      mockedCategoryRepo.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        createOvertimeUseCase(USER, { ...input, categoryId: 'cat-alien' })
      ).rejects.toThrow('Categoria não encontrada');
      expect(mockedOvertimeRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('updateOvertimeUseCase', () => {
    const existing = {
      id: 'ot-1',
      companyId: 'comp-1',
      company: { id: 'comp-1', name: 'ACME' },
      startTime: new Date('2026-03-10T18:00:00.000Z'),
      endTime: new Date('2026-03-10T20:00:00.000Z'),
      transactionId: 'tx-1',
    };

    it('recalculates amount and syncs the linked transaction when times change', async () => {
      mockedValidateOwnership.mockResolvedValue(existing);
      mockedOvertimeRepo.update.mockResolvedValue({ id: 'ot-1' } as never);

      await updateOvertimeUseCase('ot-1', USER, { endTime: '2026-03-10T21:00:00.000Z' });

      // 3h * R$50 = R$150
      expect(mockedOvertimeRepo.update).toHaveBeenCalledWith(
        'ot-1',
        USER,
        expect.objectContaining({
          startTime: new Date('2026-03-10T18:00:00.000Z'),
          endTime: new Date('2026-03-10T21:00:00.000Z'),
          hoursWorked: '3',
          hourlyRateSnapshot: '50',
          amount: '150',
          month: 3,
          year: 2026,
        })
      );
      expect(mockedTransactionRepo.update).toHaveBeenCalledWith(
        'tx-1',
        USER,
        expect.objectContaining({
          amount: '150',
          date: new Date('2026-03-10T18:00:00.000Z'),
          periodId: 'p1',
          title: 'Hora extra — ACME',
        })
      );
    });

    it('updates only the description without recalculating', async () => {
      mockedValidateOwnership.mockResolvedValue(existing);
      mockedOvertimeRepo.update.mockResolvedValue({ id: 'ot-1' } as never);

      await updateOvertimeUseCase('ot-1', USER, { description: 'Nova descrição' });

      expect(mockedOvertimeRepo.update).toHaveBeenCalledWith('ot-1', USER, {
        description: 'Nova descrição',
      });
      expect(mockedTransactionRepo.update).toHaveBeenCalledWith('tx-1', USER, {
        description: 'Nova descrição',
      });
      expect(mockedPeriodService.findOrCreatePeriodForDate).not.toHaveBeenCalled();
    });

    it('throws when the record vanishes on update', async () => {
      mockedValidateOwnership.mockResolvedValue(existing);
      mockedOvertimeRepo.update.mockResolvedValue(null);

      await expect(updateOvertimeUseCase('ot-1', USER, { description: 'x' })).rejects.toThrow(
        'Registro de hora extra não encontrado'
      );
      expect(mockedTransactionRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteOvertimeUseCase', () => {
    it('deletes the linked transaction before deleting the record', async () => {
      mockedValidateOwnership.mockResolvedValue({ id: 'ot-1', transactionId: 'tx-1' });
      mockedOvertimeRepo.delete.mockResolvedValue({ id: 'ot-1' } as never);

      const result = await deleteOvertimeUseCase('ot-1', USER);

      expect(mockedTransactionRepo.delete).toHaveBeenCalledWith('tx-1', USER);
      expect(mockedOvertimeRepo.delete).toHaveBeenCalledWith('ot-1', USER);
      expect(result).toEqual({ id: 'ot-1' });
    });

    it('skips transaction deletion when the record has no linked transaction', async () => {
      mockedValidateOwnership.mockResolvedValue({ id: 'ot-1', transactionId: null });
      mockedOvertimeRepo.delete.mockResolvedValue({ id: 'ot-1' } as never);

      await deleteOvertimeUseCase('ot-1', USER);

      expect(mockedTransactionRepo.delete).not.toHaveBeenCalled();
    });
  });
});
