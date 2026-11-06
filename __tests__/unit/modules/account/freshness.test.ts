import { spMidnight } from '@core/helpers/dates';
import { accountFreshness } from '@modules/account/helpers/freshness';

const today = spMidnight('2026-11-05');
const daysAgo = (days: number) => spMidnight(`2026-10-${String(36 - days).padStart(2, '0')}`);

describe('accountFreshness', () => {
  it('is empty when nothing was imported', () => {
    expect(accountFreshness(null, today)).toBe('empty');
  });

  it('is fresh up to 7 days after dataThrough', () => {
    expect(accountFreshness(today, today)).toBe('fresh');
    expect(accountFreshness(daysAgo(7), today)).toBe('fresh');
  });

  it('is stale from the 8th day', () => {
    expect(accountFreshness(daysAgo(8), today)).toBe('stale');
  });

  it('is fresh when dataThrough is not before today', () => {
    expect(accountFreshness(spMidnight('2026-11-08'), today)).toBe('fresh');
  });

  it('compares São Paulo days, not raw instants', () => {
    const lateEvening = new Date(spMidnight('2026-11-05').getTime() + 23 * 3600 * 1000);
    expect(accountFreshness(spMidnight('2026-10-29'), lateEvening)).toBe('fresh');
  });
});
