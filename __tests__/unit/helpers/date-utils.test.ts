/**
 * Unit tests for the São Paulo date contract helpers.
 * Contract: Date = real UTC instant; business dates are SP-day semantic,
 * canonicalized at SP midnight (03:00Z, Brazil has no DST since 2019).
 */

import {
  createNormalizedSaoPauloDate,
  createSaoPauloDate,
  formatBrazilianDate,
  formatBrazilianDateTime,
  formatSaoPauloISO,
  lastDayOfMonth,
  parseTransactionDate,
  spDayString,
  spEndOfDay,
  spMidnight,
  spMidnightOf,
  spParts,
} from '@core/helpers/dates';
import {
  calculateFirstExecution,
  calculateNextExecution,
} from '@modules/recurring-transaction/helpers/execution-dates';

describe('sp contract core', () => {
  describe('spDayString', () => {
    it('returns the SP calendar day of an instant', () => {
      // 2026-07-08T02:00:00Z = 2026-07-07 23:00 in SP
      expect(spDayString(new Date('2026-07-08T02:00:00Z'))).toBe('2026-07-07');
      // 2026-07-08T03:00:00Z = SP midnight of the 8th
      expect(spDayString(new Date('2026-07-08T03:00:00Z'))).toBe('2026-07-08');
    });

    it('treats a date-only string as an SP day', () => {
      expect(spDayString('2026-07-08')).toBe('2026-07-08');
    });
  });

  describe('spMidnight', () => {
    it('canonicalizes a date-only string to SP midnight (03:00Z)', () => {
      expect(spMidnight('2026-07-08').toISOString()).toBe('2026-07-08T03:00:00.000Z');
    });

    it('flattens any instant to the SP midnight of its SP day', () => {
      // 23:00 SP on the 7th → midnight SP of the 7th
      expect(spMidnight(new Date('2026-07-08T02:00:00Z')).toISOString()).toBe(
        '2026-07-07T03:00:00.000Z'
      );
    });

    it('is idempotent', () => {
      const canonical = spMidnight('2026-07-08');
      expect(spMidnight(canonical).toISOString()).toBe(canonical.toISOString());
    });
  });

  describe('spEndOfDay', () => {
    it('returns the last millisecond of the SP day', () => {
      expect(spEndOfDay('2026-07-08').toISOString()).toBe('2026-07-09T02:59:59.999Z');
    });
  });

  describe('spParts', () => {
    it('extracts SP calendar fields from an instant', () => {
      // 2026-07-08T02:00:00Z = SP July 7th (a Tuesday)
      const parts = spParts(new Date('2026-07-08T02:00:00Z'));
      expect(parts).toEqual({ year: 2026, month: 6, day: 7, weekday: 2 });
    });
  });

  describe('parseTransactionDate', () => {
    it('canonicalizes an explicit day', () => {
      expect(parseTransactionDate('2026-07-08').toISOString()).toBe('2026-07-08T03:00:00.000Z');
    });

    it('defaults to the current SP day at SP midnight', () => {
      const result = parseTransactionDate();
      expect(result.toISOString()).toBe(spMidnight(new Date()).toISOString());
    });
  });

  describe('spMidnightOf', () => {
    it('clamps the day to the end of the month', () => {
      expect(spDayString(spMidnightOf(2026, 1, 31))).toBe('2026-02-28');
    });

    it('resolves month overflow', () => {
      expect(spDayString(spMidnightOf(2026, 12, 5))).toBe('2027-01-05');
    });
  });

  describe('lastDayOfMonth', () => {
    it('handles leap and non-leap February', () => {
      expect(lastDayOfMonth(2024, 1)).toBe(29);
      expect(lastDayOfMonth(2023, 1)).toBe(28);
    });
  });
});

describe('recurrence on the SP calendar', () => {
  describe('calculateNextExecution', () => {
    it('daily advances one SP day at SP midnight', () => {
      const next = calculateNextExecution('daily', null, null, spMidnight('2026-07-08'));
      expect(next.toISOString()).toBe('2026-07-09T03:00:00.000Z');
    });

    it('weekly targets the requested SP weekday, always in the future', () => {
      // 2026-07-08 is a Wednesday (weekday 3); target Monday (1) → 13th
      const next = calculateNextExecution('weekly', null, 1, spMidnight('2026-07-08'));
      expect(spDayString(next)).toBe('2026-07-13');
      // same weekday → jumps a full week
      const sameDay = calculateNextExecution('weekly', null, 3, spMidnight('2026-07-08'));
      expect(spDayString(sameDay)).toBe('2026-07-15');
    });

    it('monthly with dayOfMonth clamps to short months and restores the anchor', () => {
      const jan31 = spMidnight('2026-01-31');
      const feb = calculateNextExecution('monthly', 31, null, jan31);
      expect(spDayString(feb)).toBe('2026-02-28');
      const mar = calculateNextExecution('monthly', 31, null, feb);
      expect(spDayString(mar)).toBe('2026-03-31'); // âncora persiste via dayOfMonth
    });

    it('monthly WITHOUT dayOfMonth does not skip months on the 31st (old drift bug)', () => {
      const jan31 = spMidnight('2026-01-31');
      const next = calculateNextExecution('monthly', null, null, jan31);
      expect(spDayString(next)).toBe('2026-02-28'); // antes: pulava para março
    });

    it('yearly clamps Feb 29 on non-leap years', () => {
      const next = calculateNextExecution('yearly', null, null, spMidnight('2024-02-29'));
      expect(spDayString(next)).toBe('2025-02-28');
    });
  });

  describe('calculateFirstExecution', () => {
    it('monthly with dayOfMonth returns a future SP-midnight instant on that day', () => {
      const result = calculateFirstExecution('monthly', 15, null);
      expect(spParts(result).day).toBe(15);
      expect(result.getTime()).toBeGreaterThan(Date.now());
      expect(result.toISOString()).toBe(spMidnight(result).toISOString());
    });

    it('weekly returns the next occurrence of the SP weekday', () => {
      const result = calculateFirstExecution('weekly', null, 1);
      expect(spParts(result).weekday).toBe(1);
      expect(result.getTime()).toBeGreaterThan(Date.now());
    });
  });
});

describe('legacy formatting helpers', () => {
  it('createSaoPauloDate builds the correct UTC instant for an SP wall time', () => {
    expect(createSaoPauloDate(2026, 6, 8).toISOString()).toBe('2026-07-08T03:00:00.000Z');
  });

  it('createNormalizedSaoPauloDate clamps invalid days', () => {
    expect(spDayString(createNormalizedSaoPauloDate(2026, 3, 31))).toBe('2026-04-30');
  });

  it('formatBrazilianDate renders the SP day', () => {
    expect(formatBrazilianDate(new Date('2026-07-08T02:00:00Z'))).toBe('07/07/2026');
  });

  it('formatBrazilianDateTime matches the pattern', () => {
    expect(formatBrazilianDateTime(new Date('2024-01-15T12:00:00Z'))).toMatch(
      /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/
    );
  });

  it('formatSaoPauloISO renders with the SP offset', () => {
    expect(formatSaoPauloISO(new Date('2024-01-15T12:00:00Z'))).toBe(
      '2024-01-15T09:00:00.000-03:00'
    );
  });
});
