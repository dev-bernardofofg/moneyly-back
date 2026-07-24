import { sumAmounts } from '@core/helpers/amount';
import { getCurrentSaoPauloDate } from '@core/helpers/dates';
import { calculateNextExecution } from '@modules/recurring-transaction/helpers/execution-dates';
import { formatPeriodLabel } from '@modules/financial-period';
import { recurringTransactionRepository } from '@modules/recurring-transaction/repositories/recurring-transaction.repository';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import type { RecurringFrequency } from '@modules/recurring-transaction/recurring-transaction.types';
import { requireUser } from '@modules/user';
import { HttpError } from '@core/errors/http-error';
import { financialPeriodService } from '@modules/financial-period';

const MAX_OCCURRENCE_ITERATIONS = 400;

export interface ForecastOccurrence {
  recurringTransactionId: string;
  title: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
}

export const getForecastUseCase = async (userId: string, periodId?: string) => {
  await requireUser(userId);

  const period = periodId
    ? await financialPeriodService.getPeriodById(periodId, userId)
    : await financialPeriodService.ensureCurrentPeriodExists(userId);

  if (!period) throw new HttpError(404, 'Período não encontrado');

  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);

  const transactions = await transactionRepository.findByPeriodId(userId, period.id);

  const realizedIncome = sumAmounts(transactions.filter((tx) => tx.type === 'income'));
  const realizedExpense = sumAmounts(transactions.filter((tx) => tx.type === 'expense'));
  const realizedBalance = realizedIncome - realizedExpense;

  const now = getCurrentSaoPauloDate();

  const recurrences = await recurringTransactionRepository.findByUserId(userId);

  const occurrences: ForecastOccurrence[] = [];

  for (const rec of recurrences) {
    const hasLimit = rec.totalInstallments !== null;
    let remaining = hasLimit
      ? rec.totalInstallments! - rec.executedInstallments
      : Number.POSITIVE_INFINITY;
    if (remaining <= 0) continue;

    let cursor = new Date(rec.nextExecution);
    let iterations = 0;

    while (
      cursor.getTime() <= endDate.getTime() &&
      remaining > 0 &&
      iterations < MAX_OCCURRENCE_ITERATIONS
    ) {
      iterations++;

      if (cursor.getTime() >= startDate.getTime()) {
        occurrences.push({
          recurringTransactionId: rec.id,
          title: rec.title,
          type: rec.type as 'income' | 'expense',
          amount: Number(rec.amount),
          date: cursor.toISOString(),
        });
        remaining--;
      }

      cursor = calculateNextExecution(
        rec.frequency as RecurringFrequency,
        rec.dayOfMonth,
        rec.dayOfWeek,
        cursor
      );
    }
  }

  const recurringIncome = sumAmounts(occurrences.filter((o) => o.type === 'income'));
  const recurringExpense = sumAmounts(occurrences.filter((o) => o.type === 'expense'));

  return {
    period: {
      id: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      label: formatPeriodLabel(startDate, endDate),
    },
    realized: {
      income: realizedIncome,
      expense: realizedExpense,
      balance: realizedBalance,
    },
    projected: {
      recurringIncome,
      recurringExpense,
      occurrences,
    },
    projectedEndBalance: realizedBalance + recurringIncome - recurringExpense,
    asOf: now.toISOString(),
  };
};
