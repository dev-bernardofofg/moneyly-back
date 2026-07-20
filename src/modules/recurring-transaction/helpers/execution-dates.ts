import { getCurrentSaoPauloDate } from '@core/helpers/dates';
import type { RecurringFrequency } from '../recurring-transaction.types';

export function calculateNextExecution(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null,
  from: Date = new Date()
): Date {
  const next = new Date(from);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;

    case 'weekly': {
      const daysUntil =
        dayOfWeek !== null && dayOfWeek !== undefined
          ? (dayOfWeek - next.getDay() + 7) % 7 || 7
          : 7;
      next.setDate(next.getDate() + daysUntil);
      break;
    }

    case 'monthly': {
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth) {
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDay));
      }
      break;
    }

    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

export function calculateFirstExecution(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const now = getCurrentSaoPauloDate();

  switch (frequency) {
    case 'daily':
      return calculateNextExecution('daily', null, null, now);

    case 'weekly': {
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const next = new Date(now);
        const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntil);
        return next;
      }
      return calculateNextExecution('weekly', null, null, now);
    }

    case 'monthly': {
      if (dayOfMonth) {
        const next = new Date(now);
        next.setDate(1);
        if (now.getDate() >= dayOfMonth) next.setMonth(next.getMonth() + 1);
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDay));
        return next;
      }
      return calculateNextExecution('monthly', null, null, now);
    }

    case 'yearly': {
      const next = new Date(now);
      next.setFullYear(next.getFullYear() + 1);
      return next;
    }

    default:
      return calculateNextExecution(frequency, dayOfMonth, dayOfWeek, now);
  }
}
