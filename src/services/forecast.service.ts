import { calculateNextExecution, getCurrentSaoPauloDate } from "../helpers/dates";
import { formatPeriodLabel } from "../helpers/financial-period";
import { recurringTransactionRepository } from "../repositories/recurring-transaction.repository";
import { transactionRepository } from "../repositories/transaction.repository";
import type { RecurringFrequency } from "../types/recurring-transaction.types";
import { requireUser } from "../validations/user.validation";
import { HttpError } from "../validations/errors";
import { financialPeriodService } from "./financial-period.service";

const MAX_OCCURRENCE_ITERATIONS = 400; // teto p/ frequência daily em janelas longas

export interface ForecastOccurrence {
  recurringTransactionId: string;
  title: string;
  type: "income" | "expense";
  amount: number;
  date: string;
}

export const getForecastService = async (
  userId: string,
  periodId?: string
) => {
  await requireUser(userId);

  const period = periodId
    ? await financialPeriodService.getPeriodById(periodId, userId)
    : await financialPeriodService.ensureCurrentPeriodExists(userId);

  if (!period) throw new HttpError(404, "Período não encontrado");

  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);

  const transactions = await transactionRepository.findByPeriodId(
    userId,
    period.id
  );

  const realizedIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const realizedExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const realizedBalance = realizedIncome - realizedExpense;

  const now = getCurrentSaoPauloDate();

  // Recorrentes ativas (findByUserId já filtra isActive=true por padrão)
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

      // Conta só ocorrências que caem dentro do período (ignora vencidas
      // anteriores ao início; futuras dentro da janela contam).
      if (cursor.getTime() >= startDate.getTime()) {
        occurrences.push({
          recurringTransactionId: rec.id,
          title: rec.title,
          type: rec.type as "income" | "expense",
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

  const recurringIncome = occurrences
    .filter((o) => o.type === "income")
    .reduce((sum, o) => sum + o.amount, 0);
  const recurringExpense = occurrences
    .filter((o) => o.type === "expense")
    .reduce((sum, o) => sum + o.amount, 0);

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
