import type { RecurringTransaction } from '@infra/db/schema';
import { spMidnight, spParts } from '@core/helpers/dates';
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

  // startDate ≤ hoje faria createRecurringTransactionUseCase lançar a despesa
  // de novo (a última cobrança real já está em transactions) → avançar até
  // ser estritamente futura, comparando dias no calendário SP.
  const today = spMidnight(new Date());
  let startDate = spMidnight(input.nextEstimatedDate);
  while (startDate.getTime() <= today.getTime()) {
    startDate = addCadence(startDate, input.cadence);
  }

  const startParts = spParts(startDate);

  return createRecurringTransactionUseCase(userId, {
    type: 'expense',
    title: input.title,
    amount: input.amount,
    categoryId: input.categoryId,
    frequency: input.cadence,
    dayOfMonth: input.cadence === 'monthly' ? startParts.day : undefined,
    dayOfWeek: input.cadence === 'weekly' ? startParts.weekday : undefined,
    description: input.description,
    startDate,
  });
};
