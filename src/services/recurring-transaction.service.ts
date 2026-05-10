import type { RecurringTransaction } from "../db/schema";
import { logger } from "../lib/logger";
import {
  calculateFirstExecution,
  calculateNextExecution,
  getCurrentSaoPauloDate,
} from "../helpers/dates";
import { recurringTransactionRepository } from "../repositories/recurring-transaction.repository";
import type {
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
} from "../types/recurring-transaction.types";
import { createTransactionService } from "./transaction.service";

export const createRecurringTransactionService = async (
  userId: string,
  data: CreateRecurringTransactionInput
): Promise<RecurringTransaction> => {
  const nextExecution = calculateFirstExecution(
    data.frequency,
    data.dayOfMonth,
    data.dayOfWeek
  );

  return recurringTransactionRepository.create({
    userId,
    type: data.type,
    title: data.title,
    amount: data.amount,
    categoryId: data.categoryId,
    frequency: data.frequency,
    dayOfMonth: data.dayOfMonth ?? null,
    dayOfWeek: data.dayOfWeek ?? null,
    nextExecution,
    isActive: true,
    description: data.description ?? null,
  });
};

export const getRecurringTransactionsService = async (
  userId: string,
  includeInactive = false
): Promise<RecurringTransaction[]> => {
  return recurringTransactionRepository.findByUserId(userId, includeInactive);
};

export const updateRecurringTransactionService = async (
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

export const deleteRecurringTransactionService = async (
  id: string,
  userId: string
): Promise<boolean> => {
  return recurringTransactionRepository.delete(id, userId);
};

export const deactivateRecurringTransactionService = async (
  id: string,
  userId: string
): Promise<boolean> => {
  return recurringTransactionRepository.deactivate(id, userId);
};

export const processRecurringTransactions = async (): Promise<void> => {
  const now = getCurrentSaoPauloDate();
  const due = await recurringTransactionRepository.findDueTransactions(now);

  for (const recurring of due) {
    try {
      await createTransactionService(recurring.userId, {
        type: recurring.type as "income" | "expense",
        title: recurring.title,
        amount: recurring.amount,
        category: recurring.categoryId,
        description: recurring.description ?? "",
        date: now,
      });

      const nextExecution = calculateNextExecution(
        recurring.frequency,
        recurring.dayOfMonth,
        recurring.dayOfWeek,
        now
      );

      await recurringTransactionRepository.updateNextExecution(
        recurring.id,
        nextExecution
      );
    } catch (error) {
      logger.error(`[recurring] failed to process ${recurring.id}`, error as Error);
    }
  }
};
