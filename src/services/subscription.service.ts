import type { RecurringTransaction } from '../db/schema';
import { getCurrentSaoPauloDate } from '../helpers/dates';
import {
  addCadence,
  groupSubscriptionCandidates,
  normalizeTitle,
  type SubscriptionCadence,
  type SubscriptionCandidate,
} from '../helpers/subscription-detector';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { HttpError } from '../validations/errors';
import { requireUser } from '../validations/user.validation';
import { createRecurringTransactionService } from './recurring-transaction.service';

export const detectSubscriptionsService = async (
  userId: string
): Promise<SubscriptionCandidate[]> => {
  await requireUser(userId);
  const transactions = await transactionRepository.findAllByUserId(userId);
  return groupSubscriptionCandidates(transactions);
};

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
export const convertSubscriptionToRecurringService = async (
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

  return createRecurringTransactionService(userId, {
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
