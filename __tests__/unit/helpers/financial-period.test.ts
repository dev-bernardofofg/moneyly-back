/**
 * Unit tests for the financial period helper (SP calendar contract).
 * Assertions use spDayString so they are independent of the server timezone.
 */

import { spDayString, spMidnight } from '../../../src/helpers/dates';
import {
  formatPeriodLabel,
  getCurrentFinancialPeriod,
  getFinancialPeriodForMonth,
  getPreviousFinancialPeriods,
} from '../../../src/helpers/financial-period';

describe('getCurrentFinancialPeriod', () => {
  it('computes the period when the current day >= start day (same month)', () => {
    const period = getCurrentFinancialPeriod(5, 25, spMidnight('2024-01-15'));

    expect(spDayString(period.startDate)).toBe('2024-01-05');
    expect(spDayString(period.endDate)).toBe('2024-01-25');
  });

  it('anchors on the previous month when the current day < start day', () => {
    const period = getCurrentFinancialPeriod(5, 25, spMidnight('2024-01-03'));

    expect(spDayString(period.startDate)).toBe('2023-12-05');
    expect(spDayString(period.endDate)).toBe('2023-12-25');
  });

  it('handles a period that crosses months (e.g. 25 to 5)', () => {
    const period = getCurrentFinancialPeriod(25, 5, spMidnight('2024-01-28'));

    expect(spDayString(period.startDate)).toBe('2024-01-25');
    expect(spDayString(period.endDate)).toBe('2024-02-05');
  });

  it('resolves the containing window before the start day of a crossing period', () => {
    // 03/jan com janela 25→5: período vigente começou em 25/dez
    const period = getCurrentFinancialPeriod(25, 5, spMidnight('2024-01-03'));

    expect(spDayString(period.startDate)).toBe('2023-12-25');
    expect(spDayString(period.endDate)).toBe('2024-01-05');
  });

  it('handles a single-day window (15 to 15) rolling to the next month', () => {
    const period = getCurrentFinancialPeriod(15, 15, spMidnight('2024-01-15'));

    expect(spDayString(period.startDate)).toBe('2024-01-15');
    expect(spDayString(period.endDate)).toBe('2024-02-15');
  });

  it('clamps day 31 on short months (default 1-31 window in February)', () => {
    const period = getCurrentFinancialPeriod(1, 31, spMidnight('2024-02-15'));

    expect(spDayString(period.startDate)).toBe('2024-02-01');
    expect(spDayString(period.endDate)).toBe('2024-02-29'); // bissexto
  });

  it('clamps February on a non-leap year', () => {
    const period = getCurrentFinancialPeriod(1, 31, spMidnight('2023-02-15'));

    expect(spDayString(period.endDate)).toBe('2023-02-28');
  });

  it('accepts a real instant as reference and reads its SP day', () => {
    // 02:00Z do dia 8 = dia 7 em SP → janela ancorada no dia 7
    const period = getCurrentFinancialPeriod(1, 31, new Date('2024-07-08T02:00:00Z'));

    expect(spDayString(period.startDate)).toBe('2024-07-01');
  });

  it('returns canonical SP-midnight bounds', () => {
    const period = getCurrentFinancialPeriod(5, 25, spMidnight('2024-01-15'));

    expect(period.startDate.toISOString()).toBe('2024-01-05T03:00:00.000Z');
    expect(period.endDate.toISOString()).toBe('2024-01-25T03:00:00.000Z');
  });
});

describe('getFinancialPeriodForMonth', () => {
  it('computes the period for a specific month (no crossing)', () => {
    const period = getFinancialPeriodForMonth(5, 25, 2024, 1);

    expect(spDayString(period.startDate)).toBe('2024-01-05');
    expect(spDayString(period.endDate)).toBe('2024-01-25');
  });

  it('computes the period for a specific month (crosses months)', () => {
    const period = getFinancialPeriodForMonth(25, 5, 2024, 1);

    expect(spDayString(period.startDate)).toBe('2024-01-25');
    expect(spDayString(period.endDate)).toBe('2024-02-05');
  });

  it('converts month 1-12 to the right calendar month', () => {
    const period = getFinancialPeriodForMonth(1, 31, 2024, 6);

    expect(spDayString(period.startDate)).toBe('2024-06-01');
    expect(spDayString(period.endDate)).toBe('2024-06-30');
  });
});

describe('getPreviousFinancialPeriods', () => {
  it('returns the current period first, then one per previous month', () => {
    const periods = getPreviousFinancialPeriods(1, 31, 3, spMidnight('2024-03-15'));

    expect(periods).toHaveLength(3);
    expect(spDayString(periods[0]!.startDate)).toBe('2024-03-01');
    expect(spDayString(periods[1]!.startDate)).toBe('2024-02-01');
    expect(spDayString(periods[2]!.startDate)).toBe('2024-01-01');
  });

  it('handles year transition', () => {
    const periods = getPreviousFinancialPeriods(1, 31, 3, spMidnight('2024-01-15'));

    expect(spDayString(periods[2]!.startDate)).toBe('2023-11-01');
  });

  it('is immune to end-of-month overflow on the reference date', () => {
    // Referência 31/mai: retroceder meses não pode pular abril
    const periods = getPreviousFinancialPeriods(1, 31, 3, spMidnight('2024-05-31'));

    expect(spDayString(periods[1]!.startDate)).toBe('2024-04-01');
    expect(spDayString(periods[2]!.startDate)).toBe('2024-03-01');
  });

  it('returns the requested number of periods', () => {
    const periods = getPreviousFinancialPeriods(1, 31, 10, spMidnight('2024-06-15'));

    expect(periods).toHaveLength(10);
  });
});

describe('formatPeriodLabel', () => {
  it('renders a single-month label', () => {
    const label = formatPeriodLabel(spMidnight('2024-07-01'), spMidnight('2024-07-31'));

    expect(label).toBe('Julho 2024');
  });

  it('renders a crossing-months label', () => {
    const label = formatPeriodLabel(spMidnight('2024-07-25'), spMidnight('2024-08-05'));

    expect(label).toBe('Julho - Agosto 2024');
  });

  it('renders a crossing-years label', () => {
    const label = formatPeriodLabel(spMidnight('2023-12-25'), spMidnight('2024-01-05'));

    expect(label).toBe('Dezembro 2023 - Janeiro 2024');
  });
});
