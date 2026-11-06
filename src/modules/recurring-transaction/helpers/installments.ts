import type { RecurringFrequency } from '../recurring-transaction.types';

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
