import type { RecurringTransaction } from '@infra/db/schema';
import { getCurrentSaoPauloDate } from '@core/helpers/dates';
import {
  createRecurringTransactionUseCase,
  recurringTransactionRepository,
} from '@modules/recurring-transaction';
import { HttpError } from '@core/errors/http-error';
import {
  addCadence,
  normalizeTitle,
  type SubscriptionCadence,
} from '../helpers/subscription-detector';

export interface ConvertSubscriptionInput {
  title: string;
  amount: string;
  categoryId: string;
  cadence: SubscriptionCadence;
  nextEstimatedDate: Date;
  description?: string;
}

/**
 * F10 — converte um candidato do detector (F3) em transação recorrente.
 * A última cobrança real já está em transactions (foi ela que gerou a detecção),
 * então startDate é avançada até ser estritamente futura — startDate ≤ hoje
 * faria createRecurringTransactionService lançar a despesa de novo.
 */
export const convertSubscriptionToRecurringUseCase = async (
  userId: string,
  input: ConvertSubscriptionInput
): Promise<RecurringTransaction> => {
  const normalized = normalizeTitle(input.title);
  const activeRecurring = await recurringTransactionRepository.findByUserId(userId);
  const duplicate = activeRecurring.some((r) => normalizeTitle(r.title) === normalized);
  if (duplicate) {
    throw new HttpError(409, 'Já existe uma transação recorrente ativa com este título.');
  }

  const now = getCurrentSaoPauloDate();
  let startDate = input.nextEstimatedDate;
  while (startDate <= now) {
    startDate = addCadence(startDate, input.cadence);
  }

  return createRecurringTransactionUseCase(userId, {
    type: 'expense',
    title: input.title,
    amount: input.amount,
    categoryId: input.categoryId,
    frequency: input.cadence,
    dayOfMonth: input.cadence === 'monthly' ? startDate.getDate() : undefined,
    dayOfWeek: input.cadence === 'weekly' ? startDate.getDay() : undefined,
    description: input.description,
    startDate,
  });
};
