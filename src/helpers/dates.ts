import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { RecurringFrequency } from "../types/recurring-transaction.types";

const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

export function toSaoPauloTimezone(date: Date | string): Date {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(inputDate, SAO_PAULO_TIMEZONE);
}

export function fromSaoPauloToUtc(date: Date): Date {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
}

export function createSaoPauloDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0
): Date {
  const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return toZonedTime(new Date(dateString), SAO_PAULO_TIMEZONE);
}

export function normalizeDayForMonthSaoPaulo(
  year: number,
  month: number,
  day: number
): number {
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const lastDaySaoPaulo = toZonedTime(lastDayOfMonth, SAO_PAULO_TIMEZONE);
  return Math.min(day, lastDaySaoPaulo.getDate());
}

export function createNormalizedSaoPauloDate(
  year: number,
  month: number,
  day: number
): Date {
  const normalizedDay = normalizeDayForMonthSaoPaulo(year, month, day);
  return createSaoPauloDate(year, month, normalizedDay);
}

export function getCurrentSaoPauloDate(): Date {
  return toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
}

export function formatBrazilianDate(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, "dd/MM/yyyy");
}

export function formatBrazilianDateTime(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, "dd/MM/yyyy HH:mm");
}

export function formatBrazilianDateLong(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, "dd 'de' MMMM 'de' yyyy");
}

export function parseDateToSaoPaulo(dateString: string): Date {
  return toSaoPauloTimezone(dateString);
}

export function isValidSaoPauloDate(date: Date | string): boolean {
  try {
    const saoPauloDate = toSaoPauloTimezone(date);
    return !isNaN(saoPauloDate.getTime());
  } catch {
    return false;
  }
}

export function getSaoPauloTimezoneOffset(date: Date = new Date()): number {
  const saoPauloDate = toZonedTime(date, SAO_PAULO_TIMEZONE);
  const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return (saoPauloDate.getTime() - utcDate.getTime()) / 60000;
}

export function formatSaoPauloISO(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

export function calculateNextExecution(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null,
  from: Date = new Date()
): Date {
  const next = new Date(from);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;

    case "weekly": {
      const daysUntil =
        dayOfWeek !== null && dayOfWeek !== undefined
          ? (dayOfWeek - next.getDay() + 7) % 7 || 7
          : 7;
      next.setDate(next.getDate() + daysUntil);
      break;
    }

    case "monthly": {
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth) {
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDay));
      }
      break;
    }

    case "yearly":
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
    case "daily":
      return calculateNextExecution("daily", null, null, now);

    case "weekly": {
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const next = new Date(now);
        const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntil);
        return next;
      }
      return calculateNextExecution("weekly", null, null, now);
    }

    case "monthly": {
      if (dayOfMonth) {
        const next = new Date(now);
        next.setDate(1);
        if (now.getDate() >= dayOfMonth) next.setMonth(next.getMonth() + 1);
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDay));
        return next;
      }
      return calculateNextExecution("monthly", null, null, now);
    }

    case "yearly": {
      const next = new Date(now);
      next.setFullYear(next.getFullYear() + 1);
      return next;
    }

    default:
      return calculateNextExecution(frequency, dayOfMonth, dayOfWeek, now);
  }
}
