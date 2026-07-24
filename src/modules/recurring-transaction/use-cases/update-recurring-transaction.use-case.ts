import type { RecurringTransaction } from '@infra/db/schema';
import { ConflictError } from '@core/errors';
import { calculateFirstExecution } from '../helpers/execution-dates';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';
import type { UpdateRecurringTransactionInput } from '../recurring-transaction.types';

export const updateRecurringTransactionUseCase = async (
  id: string,
  userId: string,
  data: UpdateRecurringTransactionInput
): Promise<RecurringTransaction | null> => {
  const existing = await recurringTransactionRepository.findById(id, userId);
  if (!existing) return null;

  // Parcelada já materializada: as transações foram pré-criadas; editar a
  // recorrência não realinharia as parcelas → bloquear para não enganar.
  const isExhaustedInstallment =
    existing.totalInstallments !== null &&
    existing.executedInstallments >= existing.totalInstallments;
  if (isExhaustedInstallment) {
    throw new ConflictError(
      'Recorrência parcelada já concluída não pode ser editada. Edite as transações geradas ou crie uma nova recorrência.'
    );
  }

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
