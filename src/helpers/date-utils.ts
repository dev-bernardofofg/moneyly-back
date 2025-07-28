import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/**
 * Utilitários para normalização de datas no timezone de São Paulo usando date-fns-tz
 */

// Timezone de São Paulo (GMT-3)
const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

/**
 * Converte uma data para o timezone de São Paulo
 * @param date Data a ser convertida
 * @returns Data no timezone de São Paulo
 */
export function toSaoPauloTimezone(date: Date | string): Date {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(inputDate, SAO_PAULO_TIMEZONE);
}

/**
 * Converte uma data do timezone de São Paulo para UTC
 * @param date Data no timezone de São Paulo
 * @returns Data em UTC
 */
export function fromSaoPauloToUtc(date: Date): Date {
  // Para converter de volta para UTC, criamos uma nova data
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
}

/**
 * Cria uma data no timezone de São Paulo
 * @param year Ano
 * @param month Mês (0-11)
 * @param day Dia
 * @param hours Horas (opcional, padrão 0)
 * @param minutes Minutos (opcional, padrão 0)
 * @param seconds Segundos (opcional, padrão 0)
 * @returns Data no timezone de São Paulo
 */
export function createSaoPauloDate(
  year: number,
  month: number,
  day: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0
): Date {
  // Criar string de data no formato ISO
  const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Converter para timezone de São Paulo
  return toZonedTime(new Date(dateString), SAO_PAULO_TIMEZONE);
}

/**
 * Normaliza um dia para o último dia válido do mês no timezone de São Paulo
 * @param year Ano
 * @param month Mês (0-11)
 * @param day Dia desejado
 * @returns Dia normalizado (não excede o último dia do mês)
 */
export function normalizeDayForMonthSaoPaulo(
  year: number,
  month: number,
  day: number
): number {
  // Criar data no último dia do mês no timezone de São Paulo
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const lastDaySaoPaulo = toZonedTime(lastDayOfMonth, SAO_PAULO_TIMEZONE);

  return Math.min(day, lastDaySaoPaulo.getDate());
}

/**
 * Cria uma data normalizada para o período financeiro no timezone de São Paulo
 * @param year Ano
 * @param month Mês (0-11)
 * @param day Dia desejado
 * @returns Data normalizada no timezone de São Paulo
 */
export function createNormalizedSaoPauloDate(
  year: number,
  month: number,
  day: number
): Date {
  const normalizedDay = normalizeDayForMonthSaoPaulo(year, month, day);
  return createSaoPauloDate(year, month, normalizedDay);
}

/**
 * Obtém a data atual no timezone de São Paulo
 * @returns Data atual em São Paulo
 */
export function getCurrentSaoPauloDate(): Date {
  return toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
}

/**
 * Formata uma data para exibição no formato brasileiro
 * @param date Data a ser formatada
 * @returns String formatada (dd/MM/yyyy)
 */
export function formatBrazilianDate(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, "dd/MM/yyyy");
}

/**
 * Formata uma data e hora para exibição no formato brasileiro
 * @param date Data a ser formatada
 * @returns String formatada (dd/MM/yyyy HH:mm)
 */
export function formatBrazilianDateTime(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(inputDate, SAO_PAULO_TIMEZONE, "dd/MM/yyyy HH:mm");
}

/**
 * Formata uma data para exibição com nome do mês em português
 * @param date Data a ser formatada
 * @returns String formatada (ex: "15 de janeiro de 2024")
 */
export function formatBrazilianDateLong(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(
    inputDate,
    SAO_PAULO_TIMEZONE,
    "dd 'de' MMMM 'de' yyyy"
  );
}

/**
 * Converte uma string de data para Date no timezone de São Paulo
 * @param dateString String de data (ISO, brasileira, etc.)
 * @returns Date no timezone de São Paulo
 */
export function parseDateToSaoPaulo(dateString: string): Date {
  return toSaoPauloTimezone(dateString);
}

/**
 * Verifica se uma data é válida no timezone de São Paulo
 * @param date Data a ser verificada
 * @returns true se a data é válida
 */
export function isValidSaoPauloDate(date: Date | string): boolean {
  try {
    const saoPauloDate = toSaoPauloTimezone(date);
    return !isNaN(saoPauloDate.getTime());
  } catch {
    return false;
  }
}

/**
 * Obtém o offset do timezone de São Paulo em relação ao UTC
 * @param date Data de referência (opcional)
 * @returns Offset em minutos
 */
export function getSaoPauloTimezoneOffset(date: Date = new Date()): number {
  const saoPauloDate = toZonedTime(date, SAO_PAULO_TIMEZONE);
  const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return (saoPauloDate.getTime() - utcDate.getTime()) / 60000;
}

/**
 * Formata uma data para ISO string no timezone de São Paulo
 * @param date Data a ser formatada
 * @returns String ISO no timezone de São Paulo
 */
export function formatSaoPauloISO(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(
    inputDate,
    SAO_PAULO_TIMEZONE,
    "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
  );
}
