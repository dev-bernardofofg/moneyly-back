import { spMidnightOf, spMidnightPlusDays, spParts } from '@core/helpers/dates';
import { calculateNextExecution } from './execution-dates';
import type { RecurringFrequency } from '../recurring-transaction.types';

const MAX_OCCURRENCE_ITERATIONS = 5000;
const FAR_FUTURE = new Date(8640000000000000);

export type RecurrenceSchedule = {
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  nextExecution: Date;
  totalInstallments: number | null;
  executedInstallments: number;
};

export type SalaryCandidate = RecurrenceSchedule & {
  id: string;
  type: string;
  isActive: boolean;
  amount: number | string;
};

const stepBack = (rec: RecurrenceSchedule, from: Date): Date => {
  const { year, month, day } = spParts(from);

  switch (rec.frequency) {
    case 'daily':
      return spMidnightPlusDays(year, month, day, -1);
    case 'weekly':
      return spMidnightPlusDays(year, month, day, -7);
    case 'monthly':
      return spMidnightOf(year, month - 1, rec.dayOfMonth ?? day);
    case 'yearly':
      return spMidnightOf(year - 1, month, day);
  }
};

/** Datas da recorrência em (after, before), limites exclusivos. */
export function occurrencesBetween(
  rec: RecurrenceSchedule,
  after: Date,
  before: Date,
  limit = Number.POSITIVE_INFINITY
): Date[] {
  const afterMs = after.getTime();
  const beforeMs = before.getTime();
  const nextMs = rec.nextExecution.getTime();

  // O cron já avançou nextExecution: datas anteriores a ele são ocorrências reais passadas.
  let cursor = rec.nextExecution;
  for (let i = 0; i < MAX_OCCURRENCE_ITERATIONS && cursor.getTime() > afterMs; i++) {
    const previous = stepBack(rec, cursor);
    if (previous.getTime() >= cursor.getTime()) break;
    cursor = previous;
  }

  // Só datas a partir de nextExecution consomem parcelas; as anteriores já estão em executedInstallments.
  let remaining =
    rec.totalInstallments === null
      ? Number.POSITIVE_INFINITY
      : rec.totalInstallments - rec.executedInstallments;

  const dates: Date[] = [];
  for (let i = 0; i < MAX_OCCURRENCE_ITERATIONS; i++) {
    const ms = cursor.getTime();
    if (ms >= beforeMs) break;

    const consumesInstallment = ms >= nextMs;
    if (consumesInstallment && remaining <= 0) break;

    if (ms > afterMs) {
      dates.push(cursor);
      if (dates.length >= limit) break;
    }
    if (consumesInstallment) remaining--;

    const next = calculateNextExecution(rec.frequency, rec.dayOfMonth, rec.dayOfWeek, cursor);
    if (next.getTime() <= ms) break;
    cursor = next;
  }

  return dates;
}

export function findSalary<T extends SalaryCandidate>(
  recurrences: T[],
  now: Date
): { recurrence: T; date: Date } | null {
  const candidates = recurrences
    .filter((rec) => rec.isActive && rec.type === 'income' && rec.frequency === 'monthly')
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  for (const recurrence of candidates) {
    const [date] = occurrencesBetween(recurrence, now, FAR_FUTURE, 1);
    if (date) return { recurrence, date };
  }
  return null;
}

export function overtimeMonthForSalary(salaryDate: Date): { month: number; year: number } {
  const { year, month } = spParts(salaryDate);
  const previous = new Date(Date.UTC(year, month - 1, 1));
  return { month: previous.getUTCMonth() + 1, year: previous.getUTCFullYear() };
}
