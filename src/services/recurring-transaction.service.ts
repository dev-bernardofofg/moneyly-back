import type { RecurringTransaction } from '../db/schema';
import { logger } from '../lib/logger';
import {
  calculateFirstExecution,
  calculateNextExecution,
  getCurrentSaoPauloDate,
} from '../helpers/dates';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';
import type { IRecurringTransactionRepository } from '../repositories/interfaces/IRecurringTransactionRepository';
import type { ITransactionRepository } from '../repositories/interfaces/ITransactionRepository';
import type {
  CreateRecurringTransactionInput,
  RecurringFrequency,
  UpdateRecurringTransactionInput,
} from '../types/recurring-transaction.types';
import { PaginationHelper } from '../helpers/pagination';
import { transactionRepository } from '../repositories/transaction.repository';
import { transactionService } from './transaction.service';
import { financialPeriodService } from './financial-period.service';

export interface RecurringTransactionServiceDeps {
  recurringTransactionRepository: IRecurringTransactionRepository;
  transactionRepository: Pick<ITransactionRepository, 'findByRecurringTransactionId'>;
  financialPeriodService: Pick<typeof financialPeriodService, 'createNextPeriods'>;
  createTransaction: typeof transactionService.create;
}

function calcMonthsNeeded(
  frequency: RecurringFrequency,
  totalInstallments?: number | null
): number {
  if (!totalInstallments) return 3;
  switch (frequency) {
    case 'daily':
      return Math.ceil(totalInstallments / 30);
    case 'weekly':
      return Math.ceil(totalInstallments / 4);
    case 'monthly':
      return totalInstallments;
    case 'yearly':
      return totalInstallments * 12;
    default:
      return 3;
  }
}

function generateExecutionDates(
  frequency: RecurringFrequency,
  startDate: Date,
  totalInstallments: number,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date[] {
  const dates: Date[] = [startDate];
  let prev = startDate;
  for (let i = 1; i < totalInstallments; i++) {
    const next = calculateNextExecution(frequency, dayOfMonth, dayOfWeek, prev);
    dates.push(next);
    prev = next;
  }
  return dates;
}

const MAX_OVERDUE_DAYS: Record<string, number> = {
  daily: 2,
  weekly: 14,
  monthly: 45,
  yearly: 400,
};

function isOverdue(nextExecution: Date, frequency: string, now: Date): boolean {
  const diffDays = (now.getTime() - nextExecution.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > (MAX_OVERDUE_DAYS[frequency] ?? 45);
}

export const makeRecurringTransactionService = (deps: RecurringTransactionServiceDeps) => {
  const {
    recurringTransactionRepository,
    transactionRepository,
    financialPeriodService,
    createTransaction,
  } = deps;

  const create = async (
    userId: string,
    data: CreateRecurringTransactionInput
  ): Promise<RecurringTransaction> => {
    const now = getCurrentSaoPauloDate();
    const startDate = data.startDate ?? now;

    const months = calcMonthsNeeded(data.frequency, data.totalInstallments);
    const [recurring] = await Promise.all([
      recurringTransactionRepository.create({
        userId,
        type: data.type,
        title: data.title,
        amount: data.amount,
        categoryId: data.categoryId,
        frequency: data.frequency,
        dayOfMonth: data.dayOfMonth ?? null,
        dayOfWeek: data.dayOfWeek ?? null,
        startDate,
        nextExecution: startDate,
        isActive: true,
        description: data.description ?? null,
        totalInstallments: data.totalInstallments ?? null,
        executedInstallments: 0,
      }),
      financialPeriodService.createNextPeriods(userId, months),
    ]);

    if (data.totalInstallments) {
      // Pre-create all installments immediately with their scheduled dates
      const dates = generateExecutionDates(
        data.frequency,
        startDate,
        data.totalInstallments,
        data.dayOfMonth,
        data.dayOfWeek
      );

      // Sequencial para não saturar o pool de conexões em parcelas longas.
      for (const date of dates) {
        await createTransaction(userId, {
          type: data.type,
          title: data.title,
          amount: data.amount,
          category: data.categoryId,
          description: data.description ?? '',
          date,
          recurringTransactionId: recurring.id,
        });
      }

      await recurringTransactionRepository.update(recurring.id, userId, {
        executedInstallments: data.totalInstallments,
        isActive: false,
      });

      return { ...recurring, executedInstallments: data.totalInstallments, isActive: false };
    }

    // Infinite recurring: create first transaction if startDate is today or past
    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const isImmediate = startDay <= todayStart;

    if (isImmediate) {
      await createTransaction(userId, {
        type: data.type,
        title: data.title,
        amount: data.amount,
        category: data.categoryId,
        description: data.description ?? '',
        date: startDate,
        recurringTransactionId: recurring.id,
      });

      const nextExecution = calculateNextExecution(
        data.frequency,
        data.dayOfMonth,
        data.dayOfWeek,
        startDate
      );
      await recurringTransactionRepository.update(recurring.id, userId, {
        executedInstallments: 1,
        nextExecution,
      });

      return { ...recurring, executedInstallments: 1, nextExecution };
    }

    return recurring;
  };

  const getPaginated = async (
    userId: string,
    pagination: { page?: number; limit?: number },
    includeInactive = false
  ) => {
    const paginationQuery = PaginationHelper.validateAndParse(pagination);
    return recurringTransactionRepository.findByUserIdPaginated(
      userId,
      paginationQuery,
      includeInactive
    );
  };

  const update = async (
    id: string,
    userId: string,
    data: UpdateRecurringTransactionInput
  ): Promise<RecurringTransaction | null> => {
    const existing = await recurringTransactionRepository.findById(id, userId);
    if (!existing) return null;

    const frequencyChanged = data.frequency && data.frequency !== existing.frequency;
    const dayChanged = data.dayOfMonth !== undefined || data.dayOfWeek !== undefined;

    let nextExecution: Date | undefined;
    if (frequencyChanged || dayChanged) {
      nextExecution = calculateFirstExecution(
        data.frequency ?? existing.frequency,
        data.dayOfMonth ?? existing.dayOfMonth ?? undefined,
        data.dayOfWeek ?? existing.dayOfWeek ?? undefined
      );
    }

    return recurringTransactionRepository.update(id, userId, {
      ...data,
      ...(nextExecution ? { nextExecution } : {}),
    });
  };

  const getHistory = async (id: string, userId: string) => {
    return transactionRepository.findByRecurringTransactionId(id, userId);
  };

  const remove = async (id: string, userId: string): Promise<boolean> => {
    return recurringTransactionRepository.delete(id, userId);
  };

  const reactivate = async (id: string, userId: string): Promise<RecurringTransaction | null> => {
    const existing = await recurringTransactionRepository.findById(id, userId);
    if (!existing) return null;

    const nextExecution = calculateFirstExecution(
      existing.frequency as RecurringFrequency,
      existing.dayOfMonth,
      existing.dayOfWeek
    );

    return recurringTransactionRepository.reactivate(id, userId, nextExecution);
  };

  const deactivate = async (id: string, userId: string): Promise<boolean> => {
    return recurringTransactionRepository.deactivate(id, userId);
  };

  const processDue = async (): Promise<void> => {
    const now = getCurrentSaoPauloDate();
    const due = await recurringTransactionRepository.findDueTransactions(now);

    for (const recurring of due) {
      try {
        if (isOverdue(recurring.nextExecution, recurring.frequency, now)) {
          logger.warn(
            `[recurring] skipping overdue ${recurring.id} (${recurring.frequency}, nextExecution: ${recurring.nextExecution.toISOString()})`
          );
          const nextExecution = calculateNextExecution(
            recurring.frequency,
            recurring.dayOfMonth,
            recurring.dayOfWeek,
            now
          );
          await recurringTransactionRepository.updateNextExecution(recurring.id, nextExecution);
          continue;
        }

        await createTransaction(recurring.userId, {
          type: recurring.type as 'income' | 'expense',
          title: recurring.title,
          amount: recurring.amount,
          category: recurring.categoryId,
          description: recurring.description ?? '',
          date: recurring.nextExecution,
          recurringTransactionId: recurring.id,
        });

        const updated = await recurringTransactionRepository.incrementExecutedInstallments(
          recurring.id
        );
        if (!updated) continue;

        const hasInstallmentLimit = updated.totalInstallments !== null;
        const exhausted =
          hasInstallmentLimit && updated.executedInstallments >= updated.totalInstallments!;

        if (exhausted) {
          await recurringTransactionRepository.deactivateById(recurring.id);
        } else {
          const nextExecution = calculateNextExecution(
            recurring.frequency,
            recurring.dayOfMonth,
            recurring.dayOfWeek,
            recurring.nextExecution
          );
          await recurringTransactionRepository.updateNextExecution(recurring.id, nextExecution);
        }
      } catch (error) {
        logger.error(`[recurring] failed to process ${recurring.id}`, error as Error);
      }
    }
  };

  return {
    create,
    getPaginated,
    update,
    getHistory,
    delete: remove,
    reactivate,
    deactivate,
    processDue,
  };
};

// Composition root: instância default com os singletons reais.
export const recurringTransactionService = makeRecurringTransactionService({
  recurringTransactionRepository,
  transactionRepository,
  financialPeriodService,
  createTransaction: transactionService.create,
});
