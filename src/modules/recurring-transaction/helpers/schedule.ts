import { calculateNextExecution } from './execution-dates';
import type { RecurringFrequency } from '../recurring-transaction.types';

const MAX_ADVANCE_ITERATIONS = 5000;

export type AdvanceableSchedule = {
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  nextExecution: Date;
  totalInstallments: number | null;
  executedInstallments: number;
};

/** Passa pelas ocorrências até `until` (inclusive) sem nunca ultrapassar a última parcela. */
export function advanceSchedule(
  rec: AdvanceableSchedule,
  until: Date
): { nextExecution: Date; advanced: number } {
  const remaining =
    rec.totalInstallments === null
      ? Number.POSITIVE_INFINITY
      : Math.max(rec.totalInstallments - rec.executedInstallments, 0);

  let nextExecution = rec.nextExecution;
  let advanced = 0;
  while (
    advanced < remaining &&
    advanced < MAX_ADVANCE_ITERATIONS &&
    nextExecution.getTime() <= until.getTime()
  ) {
    nextExecution = calculateNextExecution(
      rec.frequency,
      rec.dayOfMonth,
      rec.dayOfWeek,
      nextExecution
    );
    advanced++;
  }

  return { nextExecution, advanced };
}
