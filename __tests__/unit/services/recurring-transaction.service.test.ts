/**
 * Unit tests for the recurring transaction service (factory with injected dependencies).
 */

import {
  makeRecurringTransactionService,
  type RecurringTransactionServiceDeps,
} from '../../../src/services/recurring-transaction.service';

jest.mock('../../../src/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const buildDeps = () => {
  const deps = {
    recurringTransactionRepository: {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserIdPaginated: jest.fn(),
      findDueTransactions: jest.fn(),
      update: jest.fn(),
      updateNextExecution: jest.fn(),
      incrementExecutedInstallments: jest.fn(),
      deactivateById: jest.fn(),
      reactivate: jest.fn(),
      deactivate: jest.fn(),
      delete: jest.fn(),
    },
    transactionRepository: {
      findByRecurringTransactionId: jest.fn(),
    },
    financialPeriodService: {
      createNextPeriods: jest.fn().mockResolvedValue([]),
    },
    createTransaction: jest.fn(),
  };
  return deps as unknown as RecurringTransactionServiceDeps & typeof deps;
};

const baseRecurring = {
  id: 'rec-1',
  userId: 'user-1',
  type: 'expense',
  title: 'Assinatura',
  amount: '29.90',
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

describe('recurring transaction service', () => {
  describe('create', () => {
    it('pre-creates all installments and deactivates when totalInstallments is set', async () => {
      const deps = buildDeps();
      deps.recurringTransactionRepository.create.mockResolvedValue({
        ...baseRecurring,
        totalInstallments: 3,
      });
      deps.recurringTransactionRepository.update.mockResolvedValue(null);
      deps.createTransaction.mockResolvedValue({});

      const service = makeRecurringTransactionService(deps);
      const result = await service.create('user-1', {
        type: 'expense',
        title: 'Parcelado',
        amount: '100.00',
        categoryId: 'cat-1',
        frequency: 'monthly',
        totalInstallments: 3,
        startDate: new Date('2024-01-10'),
      });

      expect(deps.createTransaction).toHaveBeenCalledTimes(3);
      expect(deps.createTransaction).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ recurringTransactionId: 'rec-1' })
      );
      expect(deps.recurringTransactionRepository.update).toHaveBeenCalledWith('rec-1', 'user-1', {
        executedInstallments: 3,
        isActive: false,
      });
      expect(result.executedInstallments).toBe(3);
      expect(result.isActive).toBe(false);
    });

    it('creates the first transaction immediately for infinite recurring starting today or earlier', async () => {
      const deps = buildDeps();
      const past = new Date();
      past.setDate(past.getDate() - 1);
      deps.recurringTransactionRepository.create.mockResolvedValue(baseRecurring);
      deps.recurringTransactionRepository.update.mockResolvedValue(null);
      deps.createTransaction.mockResolvedValue({});

      const service = makeRecurringTransactionService(deps);
      const result = await service.create('user-1', {
        type: 'expense',
        title: 'Assinatura',
        amount: '29.90',
        categoryId: 'cat-1',
        frequency: 'monthly',
        startDate: past,
      });

      expect(deps.createTransaction).toHaveBeenCalledTimes(1);
      expect(deps.recurringTransactionRepository.update).toHaveBeenCalledWith(
        'rec-1',
        'user-1',
        expect.objectContaining({ executedInstallments: 1, nextExecution: expect.any(Date) })
      );
      expect(result.executedInstallments).toBe(1);
    });

    it('does not create a transaction for infinite recurring starting in the future', async () => {
      const deps = buildDeps();
      const future = new Date();
      future.setDate(future.getDate() + 10);
      deps.recurringTransactionRepository.create.mockResolvedValue(baseRecurring);

      const service = makeRecurringTransactionService(deps);
      const result = await service.create('user-1', {
        type: 'expense',
        title: 'Assinatura',
        amount: '29.90',
        categoryId: 'cat-1',
        frequency: 'monthly',
        startDate: future,
      });

      expect(deps.createTransaction).not.toHaveBeenCalled();
      expect(deps.recurringTransactionRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual(baseRecurring);
    });
  });

  describe('update', () => {
    it('returns null when the recurring transaction is not found', async () => {
      const deps = buildDeps();
      deps.recurringTransactionRepository.findById.mockResolvedValue(null);

      const service = makeRecurringTransactionService(deps);
      const result = await service.update('rec-x', 'user-1', { title: 'Novo' });

      expect(result).toBeNull();
      expect(deps.recurringTransactionRepository.update).not.toHaveBeenCalled();
    });

    it('recalculates nextExecution when the frequency changes', async () => {
      const deps = buildDeps();
      deps.recurringTransactionRepository.findById.mockResolvedValue(baseRecurring);
      deps.recurringTransactionRepository.update.mockResolvedValue(baseRecurring);

      const service = makeRecurringTransactionService(deps);
      await service.update('rec-1', 'user-1', { frequency: 'weekly', dayOfWeek: 1 });

      expect(deps.recurringTransactionRepository.update).toHaveBeenCalledWith(
        'rec-1',
        'user-1',
        expect.objectContaining({ frequency: 'weekly', nextExecution: expect.any(Date) })
      );
    });

    it('does not touch nextExecution when neither frequency nor day changes', async () => {
      const deps = buildDeps();
      deps.recurringTransactionRepository.findById.mockResolvedValue(baseRecurring);
      deps.recurringTransactionRepository.update.mockResolvedValue(baseRecurring);

      const service = makeRecurringTransactionService(deps);
      await service.update('rec-1', 'user-1', { title: 'Renomeada' });

      expect(deps.recurringTransactionRepository.update).toHaveBeenCalledWith('rec-1', 'user-1', {
        title: 'Renomeada',
      });
    });
  });

  describe('processDue', () => {
    it('materializes a due transaction and schedules the next execution', async () => {
      const deps = buildDeps();
      const due = { ...baseRecurring, nextExecution: new Date() };
      deps.recurringTransactionRepository.findDueTransactions.mockResolvedValue([due]);
      deps.createTransaction.mockResolvedValue({});
      deps.recurringTransactionRepository.incrementExecutedInstallments.mockResolvedValue({
        ...due,
        totalInstallments: null,
        executedInstallments: 1,
      });

      const service = makeRecurringTransactionService(deps);
      await service.processDue();

      expect(deps.createTransaction).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ recurringTransactionId: 'rec-1' })
      );
      expect(deps.recurringTransactionRepository.updateNextExecution).toHaveBeenCalledWith(
        'rec-1',
        expect.any(Date)
      );
      expect(deps.recurringTransactionRepository.deactivateById).not.toHaveBeenCalled();
    });

    it('deactivates the recurring transaction when installments are exhausted', async () => {
      const deps = buildDeps();
      const due = { ...baseRecurring, nextExecution: new Date(), totalInstallments: 2 };
      deps.recurringTransactionRepository.findDueTransactions.mockResolvedValue([due]);
      deps.createTransaction.mockResolvedValue({});
      deps.recurringTransactionRepository.incrementExecutedInstallments.mockResolvedValue({
        ...due,
        executedInstallments: 2,
      });

      const service = makeRecurringTransactionService(deps);
      await service.processDue();

      expect(deps.recurringTransactionRepository.deactivateById).toHaveBeenCalledWith('rec-1');
      expect(deps.recurringTransactionRepository.updateNextExecution).not.toHaveBeenCalled();
    });

    it('skips overdue executions and only reschedules', async () => {
      const deps = buildDeps();
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 90);
      const due = { ...baseRecurring, nextExecution: overdueDate };
      deps.recurringTransactionRepository.findDueTransactions.mockResolvedValue([due]);

      const service = makeRecurringTransactionService(deps);
      await service.processDue();

      expect(deps.createTransaction).not.toHaveBeenCalled();
      expect(deps.recurringTransactionRepository.updateNextExecution).toHaveBeenCalledWith(
        'rec-1',
        expect.any(Date)
      );
    });

    it('continues processing the remaining items when one fails', async () => {
      const deps = buildDeps();
      const first = { ...baseRecurring, id: 'rec-fail', nextExecution: new Date() };
      const second = { ...baseRecurring, id: 'rec-ok', nextExecution: new Date() };
      deps.recurringTransactionRepository.findDueTransactions.mockResolvedValue([first, second]);
      deps.createTransaction.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});
      deps.recurringTransactionRepository.incrementExecutedInstallments.mockResolvedValue({
        ...second,
        totalInstallments: null,
        executedInstallments: 1,
      });

      const service = makeRecurringTransactionService(deps);
      await service.processDue();

      expect(deps.createTransaction).toHaveBeenCalledTimes(2);
      expect(deps.recurringTransactionRepository.updateNextExecution).toHaveBeenCalledWith(
        'rec-ok',
        expect.any(Date)
      );
    });
  });
});
