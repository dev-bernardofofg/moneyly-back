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
import { getBudgetProgressUseCase } from '@modules/budget/use-cases/get-budget-progress.use-case';
import { listGoalsUseCase } from '@modules/goal/use-cases/list-goals.use-case';
import { overtimeRepository } from '@modules/overtime/repositories/overtime.repository';
import { accountRepository } from '@modules/account/repositories/account.repository';
import { buildOpeningBalances } from '../helpers/carry-over';
import {
  calculateBudgetReserve,
  calculateDaysRemaining,
  calculateGoalReserve,
  getForecastConfidence,
  toMoney,
} from '../helpers/free-balance';

const MAX_OCCURRENCE_ITERATIONS = 400;

export interface ForecastOccurrence {
  recurringTransactionId: string;
  title: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  categoryId: string;
}

const getOccurrenceKey = (recurringTransactionId: string, date: Date | string) =>
  `${recurringTransactionId}:${new Date(date).toISOString().slice(0, 10)}`;

export const getForecastUseCase = async (userId: string, periodId?: string) => {
  await requireUser(userId);

  const period = periodId
    ? await financialPeriodService.getPeriodById(periodId, userId)
    : await financialPeriodService.ensureCurrentPeriodExists(userId);

  if (!period) throw new HttpError(404, 'Período não encontrado');

  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);

  const [transactions, accounts] = await Promise.all([
    transactionRepository.findByPeriodId(userId, period.id),
    accountRepository.findAllByUserId(userId),
  ]);

  // Com saldo inicial informado, o que veio antes dele já está no saldo e não entra de novo.
  const balances = buildOpeningBalances(accounts, endDate);
  const counted = transactions.filter(balances.counts);
  const previousFlows = balances.since
    ? await transactionRepository.findFlowsBeforePeriod(userId, startDate, balances.since)
    : [];
  const carryOverBalance = toMoney(balances.carryOver(previousFlows));

  const realizedIncome = sumAmounts(counted.filter((tx) => tx.type === 'income'));
  const realizedExpense = sumAmounts(counted.filter((tx) => tx.type === 'expense'));
  const realizedBalance = realizedIncome - realizedExpense;

  const now = getCurrentSaoPauloDate();

  const [recurrences, budgets, goals, overtimeRecords] = await Promise.all([
    recurringTransactionRepository.findByUserId(userId),
    getBudgetProgressUseCase(userId, period.id),
    listGoalsUseCase(userId),
    overtimeRepository.findByUserIdInDateRange(userId, startDate, endDate),
  ]);

  const materializedRecurrences = new Set(
    transactions
      .filter((transaction) => transaction.recurringTransactionId)
      .map((transaction) => getOccurrenceKey(transaction.recurringTransactionId!, transaction.date))
  );

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

      // nextExecution vencido = ocorrência que o scheduler (cron diário) ainda não lançou:
      // conta 1x, como o scheduler fará, em vez de sumir do realizado e do projetado.
      const isPendingExecution = iterations === 1;

      if (
        (cursor.getTime() > now.getTime() || isPendingExecution) &&
        cursor.getTime() >= startDate.getTime()
      ) {
        const occurrence = {
          recurringTransactionId: rec.id,
          title: rec.title,
          type: rec.type as 'income' | 'expense',
          amount: Number(rec.amount),
          date: cursor.toISOString(),
          categoryId: rec.categoryId,
        };

        if (!materializedRecurrences.has(getOccurrenceKey(rec.id, cursor))) {
          occurrences.push(occurrence);
        }
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
  const realizedOvertimeIds = new Set(
    transactions
      .map((transaction) => transaction.overtimeRecordId)
      .filter((id): id is string => Boolean(id))
  );
  const realizedVariableIncome = sumAmounts(
    counted.filter((transaction) => transaction.type === 'income' && transaction.overtimeRecordId)
  );
  const pendingVariableIncome = overtimeRecords
    .filter((record) => !realizedOvertimeIds.has(record.id))
    .reduce((total, record) => total + Number(record.amount), 0);
  const budgetReserve = calculateBudgetReserve(
    budgets,
    occurrences
      .filter((occurrence) => occurrence.type === 'expense')
      .map(({ amount, categoryId }) => ({ amount, categoryId }))
  );
  const goalReserve = calculateGoalReserve(goals, startDate, endDate, now);
  const expectedFixedIncome = toMoney(realizedIncome - realizedVariableIncome + recurringIncome);
  const expectedVariableIncome = toMoney(realizedVariableIncome + pendingVariableIncome);
  const projectedEndBalance = toMoney(
    carryOverBalance + realizedBalance + recurringIncome - recurringExpense + pendingVariableIncome
  );
  const freeBalanceTotal = toMoney(projectedEndBalance - budgetReserve - goalReserve);

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
    projectedEndBalance,
    freeBalance: {
      total: freeBalanceTotal,
      daysRemaining: calculateDaysRemaining(now, endDate),
      confidence: getForecastConfidence(expectedFixedIncome, realizedIncome, budgets.length > 0),
      income: {
        fixed: expectedFixedIncome,
        variable: expectedVariableIncome,
        pendingVariable: toMoney(pendingVariableIncome),
      },
      commitments: {
        recurringExpenses: toMoney(recurringExpense),
      },
      reserves: {
        budgets: budgetReserve,
        goals: goalReserve,
      },
      components: {
        carryOverBalance,
        realizedBalance: toMoney(realizedBalance),
        futureRecurringIncome: toMoney(recurringIncome),
        futureRecurringExpense: toMoney(recurringExpense),
        pendingVariableIncome: toMoney(pendingVariableIncome),
        budgetReserve,
        goalReserve,
      },
    },
    asOf: now.toISOString(),
  };
};
