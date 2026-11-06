/**
 * Unit tests for the recurring-transaction use-cases (modular structure).
 * Repositories and cross-module singletons are mocked via jest.mock on aliases.
 */

import { spMidnightOf } from '@core/helpers/dates';
import { occurrencesBetween } from '@modules/recurring-transaction/helpers/occurrences';
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

const sp = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return spMidnightOf(y, m - 1, d);
};

const baseRecurring = {
  id: 'rec-1',
  userId: 'user-1',
  type: 'expense',
  title: 'Assinatura',
  amount: 2990,
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

const input = {
  type: 'expense' as const,
  title: 'Assinatura',
  amount: 2990,
  categoryId: 'cat-1',
  frequency: 'monthly' as const,
};

const freezeAt = (iso: string) =>
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
      'queueMicrotask',
      'performance',
      'hrtime',
    ],
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockedPeriodService.createNextPeriods.mockResolvedValue([] as never);
  mockedRepo.create.mockImplementation(async (data) => ({ ...baseRecurring, ...data }) as never);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('recurring transaction use-cases', () => {
  describe('createRecurringTransactionUseCase', () => {
    it('never creates transactions for an installment recurrence and keeps it active', async () => {
      freezeAt('2026-11-05T15:00:00Z');

      const result = await createRecurringTransactionUseCase('user-1', {
        ...input,
        totalInstallments: 3,
        startDate: sp('2026-09-10'),
      });

      expect(mockedPeriodService.createNextPeriods).toHaveBeenCalledWith('user-1', 3);
      expect(mockedCreateTransaction).not.toHaveBeenCalled();
      // Set e outubro já passaram; a terceira parcela ainda vem.
      expect(result).toMatchObject({
        executedInstallments: 2,
        isActive: true,
        nextExecution: sp('2026-11-10'),
      });
    });

    it('closes an installment recurrence whose installments all passed', async () => {
      freezeAt('2026-11-05T15:00:00Z');

      const result = await createRecurringTransactionUseCase('user-1', {
        ...input,
        totalInstallments: 2,
        startDate: sp('2026-08-10'),
      });

      expect(result).toMatchObject({
        executedInstallments: 2,
        isActive: false,
        nextExecution: sp('2026-10-10'),
      });
    });

    it('does not create a transaction for infinite recurring starting today or earlier', async () => {
      freezeAt('2026-11-05T15:00:00Z');

      const result = await createRecurringTransactionUseCase('user-1', {
        ...input,
        startDate: sp('2026-09-10'),
      });

      expect(mockedCreateTransaction).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        executedInstallments: 2,
        isActive: true,
        nextExecution: sp('2026-11-10'),
      });
    });

    it('leaves a recurrence starting today for the cron to advance', async () => {
      freezeAt('2026-11-05T15:00:00Z');

      const result = await createRecurringTransactionUseCase('user-1', {
        ...input,
        startDate: sp('2026-11-05'),
      });

      expect(mockedCreateTransaction).not.toHaveBeenCalled();
      expect(result).toMatchObject({ executedInstallments: 0, nextExecution: sp('2026-11-05') });
    });

    it('does not create a transaction for infinite recurring starting in the future', async () => {
      freezeAt('2026-11-05T15:00:00Z');

      const result = await createRecurringTransactionUseCase('user-1', {
        ...input,
        startDate: sp('2026-11-15'),
      });

      expect(mockedCreateTransaction).not.toHaveBeenCalled();
      expect(result).toMatchObject({ executedInstallments: 0, nextExecution: sp('2026-11-15') });
    });

    it('keeps occurrencesBetween and the cron in agreement about installments', async () => {
      freezeAt('2026-11-05T15:00:00Z');
      const created = await createRecurringTransactionUseCase('user-1', {
        ...input,
        totalInstallments: 3,
        startDate: sp('2026-09-10'),
      });
      const all = [sp('2026-09-10'), sp('2026-10-10'), sp('2026-11-10')];
      const window = (rec: typeof created) =>
        occurrencesBetween(rec as never, sp('2026-08-01'), sp('2027-06-01'));

      expect(window(created)).toEqual(all);

      freezeAt('2026-11-10T15:00:00Z');
      mockedRepo.findDueTransactions.mockResolvedValue([created] as never);
      mockedRepo.claimExecution.mockResolvedValue(true);
      await processRecurringTransactions();
      const [, nextExecution, advanced] = mockedRepo.claimExecution.mock.calls[0]!;
      const afterCron = {
        ...created,
        nextExecution,
        executedInstallments: created.executedInstallments + (advanced ?? 0),
      };

      expect(window(afterCron as never)).toEqual(all);
    });
  });

  describe('updateRecurringTransactionUseCase', () => {
    it('returns null when the recurring transaction is not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      const result = await updateRecurringTransactionUseCase('rec-x', 'user-1', { title: 'Novo' });

      expect(result).toBeNull();
      expect(mockedRepo.update).not.toHaveBeenCalled();
    });

    it('rejects editing an installment recurring already concluded', async () => {
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
    it('only advances the schedule, without creating transactions', async () => {
      freezeAt('2026-02-10T15:00:00Z');
      const due = { ...baseRecurring, nextExecution: sp('2026-02-10') };
      mockedRepo.findDueTransactions.mockResolvedValue([due] as never);
      mockedRepo.claimExecution.mockResolvedValue(true);

      await processRecurringTransactions();

      expect(mockedRepo.claimExecution).toHaveBeenCalledWith(due, sp('2026-03-10'), 1);
      expect(mockedCreateTransaction).not.toHaveBeenCalled();
    });

    it('skips an execution another run already claimed', async () => {
      freezeAt('2026-02-10T15:00:00Z');
      const due = { ...baseRecurring, nextExecution: sp('2026-02-10') };
      mockedRepo.findDueTransactions.mockResolvedValue([due] as never);
      mockedRepo.claimExecution.mockResolvedValue(false);

      await processRecurringTransactions();

      expect(mockedRepo.claimExecution).toHaveBeenCalledTimes(1);
      expect(mockedCreateTransaction).not.toHaveBeenCalled();
    });

    it('catches up missed occurrences counting each one as an installment', async () => {
      freezeAt('2026-04-12T15:00:00Z');
      const due = {
        ...baseRecurring,
        totalInstallments: 6,
        executedInstallments: 1,
        nextExecution: sp('2026-02-10'),
      };
      mockedRepo.findDueTransactions.mockResolvedValue([due] as never);
      mockedRepo.claimExecution.mockResolvedValue(true);

      await processRecurringTransactions();

      // fev, mar e abr passaram sem o cron rodar.
      expect(mockedRepo.claimExecution).toHaveBeenCalledWith(due, sp('2026-05-10'), 3);
    });

    it('never advances past the last installment', async () => {
      freezeAt('2026-06-12T15:00:00Z');
      const due = {
        ...baseRecurring,
        totalInstallments: 3,
        executedInstallments: 1,
        nextExecution: sp('2026-02-10'),
      };
      mockedRepo.findDueTransactions.mockResolvedValue([due] as never);
      mockedRepo.claimExecution.mockResolvedValue(true);

      await processRecurringTransactions();

      expect(mockedRepo.claimExecution).toHaveBeenCalledWith(due, sp('2026-04-10'), 2);
    });

    it('keeps going when one recurrence fails', async () => {
      freezeAt('2026-02-10T15:00:00Z');
      const first = { ...baseRecurring, id: 'rec-fail', nextExecution: sp('2026-02-10') };
      const second = { ...baseRecurring, id: 'rec-ok', nextExecution: sp('2026-02-10') };
      mockedRepo.findDueTransactions.mockResolvedValue([first, second] as never);
      mockedRepo.claimExecution
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(true);

      await processRecurringTransactions();

      expect(mockedRepo.claimExecution).toHaveBeenCalledTimes(2);
    });
  });
});
