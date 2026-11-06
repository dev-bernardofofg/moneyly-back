import { spMidnight, spMidnightOf, spParts } from '@core/helpers/dates';

export type AccountFreshness = 'fresh' | 'stale' | 'empty';

const FRESH_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const daysBetween = (from: Date, to: Date) =>
  Math.round((spMidnight(to).getTime() - spMidnight(from).getTime()) / DAY_MS);

// Fatura sai uma vez por mês: o dado vale até a fatura seguinte fechar e chegar (mais a janela).
export function accountFreshness(
  dataThrough: Date | null,
  today: Date,
  closingDay?: number | null
): AccountFreshness {
  if (!dataThrough) return 'empty';
  if (!closingDay) {
    return daysBetween(dataThrough, today) <= FRESH_WINDOW_DAYS ? 'fresh' : 'stale';
  }

  const { year, month } = spParts(dataThrough);
  let firstClosing = spMidnightOf(year, month, closingDay);
  if (firstClosing.getTime() < spMidnight(dataThrough).getTime()) {
    firstClosing = spMidnightOf(year, month + 1, closingDay);
  }
  const { year: closingYear, month: closingMonth } = spParts(firstClosing);
  const nextClosing = spMidnightOf(closingYear, closingMonth + 1, closingDay);
  return daysBetween(nextClosing, today) <= FRESH_WINDOW_DAYS ? 'fresh' : 'stale';
}
