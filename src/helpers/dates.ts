import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { RecurringFrequency } from '../types/recurring-transaction.types';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * CONTRATO DE DATAS (ver .specs/02-conventions.md §Datas):
 * - Date em código/banco = instante UTC real. NUNCA persistir/comparar o retorno
 *   de toZonedTime (wall-clock deslocado — só para exibição/extração legada).
 * - Datas de negócio (transactions.date, recurring.startDate/nextExecution) são
 *   dia-semânticas: canonizadas na MEIA-NOITE de São Paulo via spMidnight.
 * - Decisão de calendário (que dia/mês/período) usa os campos SP do instante
 *   (spDayString/spParts) e volta para instante com fromZonedTime.
 * - Exceção com hora real: overtime.startTime/endTime (e o transactions.date
 *   espelhado dele).
 */

// ——— Núcleo do contrato ———

/** Dia calendário de São Paulo ('yyyy-MM-dd') do instante dado. */
export function spDayString(date: Date | string): string {
  const input = typeof date === 'string' ? parseFlexible(date) : date;
  return formatInTimeZone(input, SAO_PAULO_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Instante canônico (UTC) da meia-noite de São Paulo do dia informado.
 * Aceita 'yyyy-MM-dd', ISO completo ou Date — sempre reduz ao dia SP.
 */
export function spMidnight(input: Date | string): Date {
  const day = typeof input === 'string' && DATE_ONLY_RE.test(input) ? input : spDayString(input);
  return fromZonedTime(`${day}T00:00:00`, SAO_PAULO_TIMEZONE);
}

/** Instante do fim do dia SP (23:59:59.999) — para limites superiores inclusivos. */
export function spEndOfDay(input: Date | string): Date {
  const start = spMidnight(input);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Campos do calendário SP do instante (month 0-11, weekday 0=domingo). */
export function spParts(date: Date | string): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const [y, m, d] = spDayString(date).split('-').map(Number) as [number, number, number];
  return { year: y, month: m - 1, day: d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/**
 * Normaliza a data de uma transação para o contrato: dia SP → meia-noite SP.
 * Sem input, usa o dia SP de agora.
 */
export function parseTransactionDate(input?: Date | string | null): Date {
  return spMidnight(input ?? new Date());
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 'yyyy-MM-dd' → meia-noite SP; demais strings → Date(string). */
function parseFlexible(value: string): Date {
  if (DATE_ONLY_RE.test(value)) {
    return fromZonedTime(`${value}T00:00:00`, SAO_PAULO_TIMEZONE);
  }
  return new Date(value);
}

/** Último dia do mês (month 0-11), independente de timezone do servidor. */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Meia-noite SP de (year, month 0-11, day), com overflow resolvido e dia clampado. */
export function spMidnightOf(year: number, month: number, day: number): Date {
  // Date.UTC resolve overflow de mês (ex.: month 12 → jan do ano seguinte)
  const rolled = new Date(Date.UTC(year, month, 1));
  const y = rolled.getUTCFullYear();
  const m = rolled.getUTCMonth();
  const d = Math.min(day, lastDayOfMonth(y, m));
  const pad = (n: number) => String(n).padStart(2, '0');
  return fromZonedTime(`${y}-${pad(m + 1)}-${pad(d)}T00:00:00`, SAO_PAULO_TIMEZONE);
}

// ——— Legado (exibição/extração). NÃO persistir nem comparar o retorno. ———

/** @deprecated Wall-clock deslocado. Use spDayString/spParts para calendário e formatBrazilian* para exibição. */
export function toSaoPauloTimezone(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(inputDate, SAO_PAULO_TIMEZONE);
}

/** @deprecated Wall-clock deslocado de "agora". Para lógica use new Date(); para o dia SP use spDayString(new Date()). */
export function getCurrentSaoPauloDate(): Date {
  return toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
}

export function createSaoPauloDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0
): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  const isoLocal = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return fromZonedTime(isoLocal, SAO_PAULO_TIMEZONE);
}

export function normalizeDayForMonthSaoPaulo(year: number, month: number, day: number): number {
  return Math.min(day, lastDayOfMonth(year, month));
}

export function createNormalizedSaoPauloDate(year: number, month: number, day: number): Date {
  const normalizedDay = normalizeDayForMonthSaoPaulo(year, month, day);
  return createSaoPauloDate(year, month, normalizedDay);
}

// ——— Formatação (única porta de saída SP) ———

export function formatBrazilianDate(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, 'dd/MM/yyyy');
}

export function formatBrazilianDateTime(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, 'dd/MM/yyyy HH:mm');
}

export function formatBrazilianTime(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, 'HH:mm');
}

export function formatBrazilianDateLong(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, "dd 'de' MMMM 'de' yyyy");
}

export function formatSaoPauloISO(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

// ——— Recorrência (opera no calendário SP; retorna instantes canônicos) ———

/**
 * Próxima execução a partir de `from`, no calendário SP. Retorna meia-noite SP.
 * monthly sem dayOfMonth: âncora = dia SP de `from`, clampado ao fim do mês
 * (31/jan → 28/fev; não pula mês). Para âncora fixa, persistir dayOfMonth.
 */
export function calculateNextExecution(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null,
  from: Date = new Date()
): Date {
  const { year, month, day, weekday } = spParts(from);

  switch (frequency) {
    case 'daily':
      return spMidnightOf(year, month, day + 1);

    case 'weekly': {
      const target = dayOfWeek ?? weekday;
      const daysUntil = (target - weekday + 7) % 7 || 7;
      return spMidnightOf(year, month, day + daysUntil);
    }

    case 'monthly': {
      const anchor = dayOfMonth ?? day;
      return spMidnightOf(year, month + 1, anchor);
    }

    case 'yearly':
      return spMidnightOf(year + 1, month, day);
  }
}

/** Primeira execução futura a partir de agora (calendário SP). */
export function calculateFirstExecution(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const now = new Date();
  const { year, month, day } = spParts(now);

  switch (frequency) {
    case 'daily':
      return spMidnightOf(year, month, day + 1);

    case 'weekly':
      return calculateNextExecution('weekly', null, dayOfWeek ?? null, now);

    case 'monthly': {
      if (dayOfMonth) {
        // Próximo dia D: neste mês se ainda não passou, senão no seguinte.
        const targetMonth = day >= dayOfMonth ? month + 1 : month;
        return spMidnightOf(year, targetMonth, dayOfMonth);
      }
      return calculateNextExecution('monthly', null, null, now);
    }

    case 'yearly':
      return spMidnightOf(year + 1, month, day);
  }
}
