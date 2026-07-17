import type { RecurringFrequency } from '../recurring-transaction.types';
import { calculateNextExecution } from './execution-dates';

export function calcMonthsNeeded(
  frequency: RecurringFrequency,
  totalInstallments?: number | null
): number {
  if (!totalInstallments) return 3;
  switch (frequency) {
    case 'daily':
      return Math.ceil(totalInstallments / 30);
    case 'weekly':
      return Math.ceil(totalInstallments / 4);
    case 'monthly':
      return totalInstallments;
    case 'yearly':
      return totalInstallments * 12;
    default:
      return 3;
  }
}

export function generateExecutionDates(
  frequency: RecurringFrequency,
  startDate: Date,
  totalInstallments: number,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date[] {
  const dates: Date[] = [startDate];
  let prev = startDate;
  for (let i = 1; i < totalInstallments; i++) {
    const next = calculateNextExecution(frequency, dayOfMonth, dayOfWeek, prev);
    dates.push(next);
    prev = next;
  }
  return dates;
}
