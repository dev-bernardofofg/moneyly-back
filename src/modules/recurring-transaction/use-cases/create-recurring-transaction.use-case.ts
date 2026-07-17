import type { RecurringTransaction } from '../../../infra/db/schema';
import { getCurrentSaoPauloDate } from '../../../core/helpers/dates';
import { createTransactionUseCase } from '../../transaction';
import { financialPeriodService } from '../../financial-period';
import { calculateNextExecution } from '../helpers/execution-dates';
import { calcMonthsNeeded, generateExecutionDates } from '../helpers/installments';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';
import type { CreateRecurringTransactionInput } from '../recurring-transaction.types';

export const createRecurringTransactionUseCase = async (
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
      await createTransactionUseCase(userId, {
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
    await createTransactionUseCase(userId, {
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
