import { getCurrentSaoPauloDate } from '@core/helpers/dates';

export function monthsUntilDate(target: Date): number {
  const now = getCurrentSaoPauloDate();
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()) + 1;
  return Math.max(months, 0);
}
