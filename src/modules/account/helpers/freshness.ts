import { spMidnight } from '@core/helpers/dates';

export type AccountFreshness = 'fresh' | 'stale' | 'empty';

const FRESH_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function accountFreshness(dataThrough: Date | null, today: Date): AccountFreshness {
  if (!dataThrough) return 'empty';
  const days = Math.round(
    (spMidnight(today).getTime() - spMidnight(dataThrough).getTime()) / DAY_MS
  );
  return days <= FRESH_WINDOW_DAYS ? 'fresh' : 'stale';
}
