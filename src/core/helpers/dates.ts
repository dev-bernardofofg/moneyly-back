import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

export function toSaoPauloTimezone(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
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
  // Use Date.UTC to resolve month/day overflow (e.g. month=-1 → Dec, day=32 → next month)
  // without depending on server local timezone. Then build an ISO string treated as SP local
  // time by fromZonedTime, which returns the correct UTC instant regardless of server TZ.
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  const isoLocal = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return fromZonedTime(isoLocal, SAO_PAULO_TIMEZONE);
}

export function normalizeDayForMonthSaoPaulo(year: number, month: number, day: number): number {
  // Date.UTC with day=0 gives last day of previous month — no server timezone dependency.
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
  return Math.min(day, lastDayOfMonth.getUTCDate());
}

export function createNormalizedSaoPauloDate(year: number, month: number, day: number): Date {
  const normalizedDay = normalizeDayForMonthSaoPaulo(year, month, day);
  return createSaoPauloDate(year, month, normalizedDay);
}

export function getCurrentSaoPauloDate(): Date {
  return toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
}

export function formatBrazilianDate(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, 'dd/MM/yyyy');
}

export function formatIsoDateSaoPaulo(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, 'yyyy-MM-dd');
}

export function formatBrazilianDateTime(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, 'dd/MM/yyyy HH:mm');
}

export function formatBrazilianDateLong(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
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
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}
