import type { RecurringTransaction } from '@infra/db/schema';
import { spMidnight, spParts } from '@core/helpers/dates';
import { createTransactionUseCase } from '@modules/transaction';
import { financialPeriodService } from '@modules/financial-period';
import { calculateNextExecution } from '../helpers/execution-dates';
import { calcMonthsNeeded, generateExecutionDates } from '../helpers/installments';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';
import type { CreateRecurringTransactionInput } from '../recurring-transaction.types';

export const createRecurringTransactionUseCase = async (
  userId: string,
  data: CreateRecurringTransactionInput
): Promise<RecurringTransaction> => {
  // Contrato: dia-semântica → meia-noite SP.
  const startDate = spMidnight(data.startDate ?? new Date());
  const startParts = spParts(startDate);

  // Âncora persistida: sem ela, recorrência mensal criada dia 29-31 derraparia
  // após passar por um mês curto (28/fev viraria a nova âncora).
  const dayOfMonth = data.dayOfMonth ?? (data.frequency === 'monthly' ? startParts.day : null);
  const dayOfWeek = data.dayOfWeek ?? (data.frequency === 'weekly' ? startParts.weekday : null);

  const months = calcMonthsNeeded(data.frequency, data.totalInstallments);
  const [recurring] = await Promise.all([
    recurringTransactionRepository.create({
      userId,
      type: data.type,
      title: data.title,
      amount: data.amount,
      categoryId: data.categoryId,
      frequency: data.frequency,
      dayOfMonth,
      dayOfWeek,
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
      dayOfMonth,
      dayOfWeek
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

  // Infinite recurring: create first transaction if startDate is today or past (SP days)
  const isImmediate = startDate.getTime() <= spMidnight(new Date()).getTime();

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

    const nextExecution = calculateNextExecution(data.frequency, dayOfMonth, dayOfWeek, startDate);
    await recurringTransactionRepository.update(recurring.id, userId, {
      executedInstallments: 1,
      nextExecution,
    });

    return { ...recurring, executedInstallments: 1, nextExecution };
  }

  return recurring;
};
