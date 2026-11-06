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
  describe('credit card with closing day', () => {
    const through = spMidnight('2026-10-20');

    it('is fresh until 7 days after the closing of the next month', () => {
      expect(accountFreshness(through, spMidnight('2026-11-05'), 25)).toBe('fresh');
      expect(accountFreshness(through, spMidnight('2026-12-02'), 25)).toBe('fresh');
    });

    it('turns stale the day after that', () => {
      expect(accountFreshness(through, spMidnight('2026-12-03'), 25)).toBe('stale');
    });

    it('counts a dataThrough on the closing day as already closed', () => {
      expect(accountFreshness(spMidnight('2026-10-25'), spMidnight('2026-12-02'), 25)).toBe(
        'fresh'
      );
      expect(accountFreshness(spMidnight('2026-10-25'), spMidnight('2026-12-03'), 25)).toBe(
        'stale'
      );
    });

    it('clamps closing day 31 to the last day of February', () => {
      const jan = spMidnight('2027-01-10');
      expect(accountFreshness(jan, spMidnight('2027-03-07'), 31)).toBe('fresh');
      expect(accountFreshness(jan, spMidnight('2027-03-08'), 31)).toBe('stale');
    });

    it('stays empty without dataThrough and keeps 7 days without closing day', () => {
      expect(accountFreshness(null, today, 25)).toBe('empty');
      expect(accountFreshness(daysAgo(8), today, null)).toBe('stale');
      expect(accountFreshness(daysAgo(7), today, undefined)).toBe('fresh');
    });
  });
});
