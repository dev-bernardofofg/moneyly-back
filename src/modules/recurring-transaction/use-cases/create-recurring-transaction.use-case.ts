import type { RecurringTransaction } from '@infra/db/schema';
import { spMidnight, spParts } from '@core/helpers/dates';
import { resolveAccountId } from '@modules/account/use-cases/account.use-cases';
import { financialPeriodService } from '@modules/financial-period';
import { calcMonthsNeeded } from '../helpers/installments';
import { advanceSchedule } from '../helpers/schedule';
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

  if (data.accountId) await resolveAccountId(userId, data.accountId);
  const accountId = data.accountId ?? null;

  const totalInstallments = data.totalInstallments ?? null;

  // Não cria transação: o dinheiro vem do extrato. Ocorrências de hoje ficam para o cron;
  // as anteriores já contam como passadas, mantendo nextExecution e parcelas alinhados.
  const startOfToday = spMidnight(new Date());
  const { nextExecution, advanced } = advanceSchedule(
    {
      frequency: data.frequency,
      dayOfMonth,
      dayOfWeek,
      nextExecution: startDate,
      totalInstallments,
      executedInstallments: 0,
    },
    new Date(startOfToday.getTime() - 1)
  );

  const months = calcMonthsNeeded(data.frequency, data.totalInstallments);
  const [recurring] = await Promise.all([
    recurringTransactionRepository.create({
      userId,
      type: data.type,
      title: data.title,
      amount: data.amount,
      categoryId: data.categoryId,
      accountId,
      frequency: data.frequency,
      dayOfMonth,
      dayOfWeek,
      startDate,
      nextExecution,
      isActive: totalInstallments === null || advanced < totalInstallments,
      description: data.description ?? null,
      totalInstallments,
      executedInstallments: advanced,
    }),
    financialPeriodService.createNextPeriods(userId, months),
  ]);

  return recurring;
};
