/**
 * Unit tests for the recurring-transaction use-cases (modular structure).
 * Repositories and cross-module singletons are mocked via jest.mock on aliases.
 */

import { spMidnight } from '@core/helpers/dates';
import { recurringTransactionRepository } from '@modules/recurring-transaction/repositories/recurring-transaction.repository';
import { createRecurringTransactionUseCase } from '@modules/recurring-transaction/use-cases/create-recurring-transaction.use-case';
import { processRecurringTransactions } from '@modules/recurring-transaction/use-cases/process-recurring-transactions.use-case';
import { updateRecurringTransactionUseCase } from '@modules/recurring-transaction/use-cases/update-recurring-transaction.use-case';
import { createTransactionUseCase } from '@modules/transaction';
import { financialPeriodService } from '@modules/financial-period';

jest.mock('@modules/recurring-transaction/repositories/recurring-transaction.repository');
jest.mock('@modules/transaction', () => ({
  createTransactionUseCase: jest.fn(),
}));
jest.mock('@modules/financial-period', () => ({
  financialPeriodService: {
    createNextPeriods: jest.fn(),
  },
}));
jest.mock('@core/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const mockedRepo = recurringTransactionRepository as jest.Mocked<
  typeof recurringTransactionRepository
>;
const mockedCreateTransaction = createTransactionUseCase as jest.Mock;
const mockedPeriodService = financialPeriodService as jest.Mocked<typeof financialPeriodService>;

const baseRecurring = {
  id: 'rec-1',
  userId: 'user-1',
  type: 'expense',
  title: 'Assinatura',
  amount: 29.9,
  categoryId: 'cat-1',
  frequency: 'monthly',
  dayOfMonth: 10,
  dayOfWeek: null,
  startDate: new Date('2024-01-10'),
  nextExecution: new Date('2024-01-10'),
  isActive: true,
  description: null,
  totalInstallments: null,
  executedInstallments: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedPeriodService.createNextPeriods.mockResolvedValue([] as never);
});

describe('recurring transaction use-cases', () => {
  describe('createRecurringTransactionUseCase', () => {
    it('pre-creates all installments on a recurrence saved already inactive', async () => {
      mockedRepo.create.mockImplementation(
        async (data) => ({ ...baseRecurring, ...data }) as never
      );
      mockedCreateTransaction.mockResolvedValue({});

      const result = await createRecurringTransactionUseCase('user-1', {
        type: 'expense',
        title: 'Parcelado',
        amount: 100.0,
        categoryId: 'cat-1',
        frequency: 'monthly',
        totalInstallments: 3,
        startDate: new Date('2024-01-10'),
      });

      expect(mockedPeriodService.createNextPeriods).toHaveBeenCalledWith('user-1', 3);
      expect(mockedCreateTransaction).toHaveBeenCalledTimes(3);
      expect(mockedCreateTransaction).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ recurringTransactionId: 'rec-1' })
      );
      // Salva já concluída: o cron não pode pegar a recorrência no meio da criação.
      expect(mockedRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ executedInstallments: 3, isActive: false })
      );
      expect(mockedRepo.update).not.toHaveBeenCalled();
      expect(result.executedInstallments).toBe(3);
      expect(result.isActive).toBe(false);
    });

    it('creates the first transaction immediately for infinite recurring starting today or earlier', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      mockedRepo.create.mockImplementation(
        async (data) => ({ ...baseRecurring, ...data }) as never
      );
      mockedCreateTransaction.mockResolvedValue({});

      const result = await createRecurringTransactionUseCase('user-1', {
        type: 'expense',
        title: 'Assinatura',
        amount: 29.9,
        categoryId: 'cat-1',
        frequency: 'monthly',
        startDate: past,
      });

      expect(mockedCreateTransaction).toHaveBeenCalledTimes(1);
      expect(mockedCreateTransaction).toHaveBeenCalledWith(
        'user-1',
        // Contrato: a data persistida é o dia SP canonizado na meia-noite SP.
        expect.objectContaining({ recurringTransactionId: 'rec-1', date: spMidnight(past) })
      );
      // A primeira execução já sai avançada no insert: o cron não a lança de novo.
      const saved = mockedRepo.create.mock.calls[0]![0];
      expect(saved).toMatchObject({ executedInstallments: 1, isActive: true });
      expect(saved.nextExecution.getTime()).toBeGreaterThan(spMidnight(past).getTime());
      expect(result.executedInstallments).toBe(1);
    });

    it('does not create a transaction for infinite recurring starting in the future', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      mockedRepo.create.mockResolvedValue(baseRecurring as never);

      const result = await createRecurringTransactionUseCase('user-1', {
        type: 'expense',
        title: 'Assinatura',
        amount: 29.9,
        categoryId: 'cat-1',
        frequency: 'monthly',
        startDate: future,
      });

      expect(mockedCreateTransaction).not.toHaveBeenCalled();
      expect(mockedRepo.update).not.toHaveBeenCalled();
      expect(result).toEqual(baseRecurring);
    });
  });

  describe('updateRecurringTransactionUseCase', () => {
    it('returns null when the recurring transaction is not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      const result = await updateRecurringTransactionUseCase('rec-x', 'user-1', { title: 'Novo' });

      expect(result).toBeNull();
      expect(mockedRepo.update).not.toHaveBeenCalled();
    });

    it('rejects editing an installment recurring already fully materialized', async () => {
      mockedRepo.findById.mockResolvedValue({
        ...baseRecurring,
        totalInstallments: 3,
        executedInstallments: 3,
        isActive: false,
      } as never);

      await expect(
        updateRecurringTransactionUseCase('rec-1', 'user-1', { title: 'Novo' })
      ).rejects.toThrow('Recorrência parcelada já concluída não pode ser editada');

      expect(mockedRepo.update).not.toHaveBeenCalled();
    });

    it('recalculates nextExecution when the frequency changes', async () => {
      mockedRepo.findById.mockResolvedValue(baseRecurring as never);
      mockedRepo.update.mockResolvedValue(baseRecurring as never);

      await updateRecurringTransactionUseCase('rec-1', 'user-1', {
        frequency: 'weekly',
        dayOfWeek: 1,
      });

      expect(mockedRepo.update).toHaveBeenCalledWith(
        'rec-1',
        'user-1',
        expect.objectContaining({ frequency: 'weekly', nextExecution: expect.any(Date) })
      );
    });

    it('does not touch nextExecution when neither frequency nor day changes', async () => {
      mockedRepo.findById.mockResolvedValue(baseRecurring as never);
      mockedRepo.update.mockResolvedValue(baseRecurring as never);

      await updateRecurringTransactionUseCase('rec-1', 'user-1', { title: 'Renomeada' });

      expect(mockedRepo.update).toHaveBeenCalledWith('rec-1', 'user-1', {
        title: 'Renomeada',
      });
    });
  });

  describe('processRecurringTransactions', () => {
    it('claims the due execution before materializing it', async () => {
      const due = { ...baseRecurring, nextExecution: new Date() };
      mockedRepo.findDueTransactions.mockResolvedValue([due] as never);
      mockedRepo.claimExecution.mockResolvedValue(true);
      mockedCreateTransaction.mockResolvedValue({});

      await processRecurringTransactions();

      expect(mockedRepo.claimExecution).toHaveBeenCalledWith(due, expect.any(Date));
      expect(mockedCreateTransaction).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ recurringTransactionId: 'rec-1' })
      );
    });

    it('skips an execution another run already claimed', async () => {
      const due = { ...baseRecurring, nextExecution: new Date() };
      mockedRepo.findDueTransactions.mockResolvedValue([due] as never);
      mockedRepo.claimExecution.mockResolvedValue(false);

      await processRecurringTransactions();

      expect(mockedCreateTransaction).not.toHaveBeenCalled();
    });

    it('skips overdue executions and only reschedules', async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 90);
      const due = { ...baseRecurring, nextExecution: overdueDate };
      mockedRepo.findDueTransactions.mockResolvedValue([due] as never);

      await processRecurringTransactions();

      expect(mockedCreateTransaction).not.toHaveBeenCalled();
      expect(mockedRepo.claimExecution).not.toHaveBeenCalled();
      expect(mockedRepo.updateNextExecution).toHaveBeenCalledWith('rec-1', expect.any(Date));
    });

    it('releases the claim and keeps going when materializing fails', async () => {
      const first = { ...baseRecurring, id: 'rec-fail', nextExecution: new Date() };
      const second = { ...baseRecurring, id: 'rec-ok', nextExecution: new Date() };
      mockedRepo.findDueTransactions.mockResolvedValue([first, second] as never);
      mockedRepo.claimExecution.mockResolvedValue(true);
      mockedCreateTransaction.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});

      await processRecurringTransactions();

      expect(mockedRepo.releaseExecution).toHaveBeenCalledWith(first);
      expect(mockedCreateTransaction).toHaveBeenCalledTimes(2);
    });
  });
});
