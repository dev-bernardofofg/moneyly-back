import { logger } from '@core/lib/logger';
import { createTransactionUseCase } from '@modules/transaction';
import { calculateNextExecution } from '../helpers/execution-dates';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';

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

export const processRecurringTransactions = async (): Promise<void> => {
  const now = new Date();
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

      await createTransactionUseCase(recurring.userId, {
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
