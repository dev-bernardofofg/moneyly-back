import { spMidnight } from '@core/helpers/dates';
import { billingDateFor, invoiceDueDate } from '@modules/account/helpers/billing-date';

describe('invoiceDueDate', () => {
  it('bills a purchase before closing in the same cycle (due next month)', () => {
    expect(invoiceDueDate(spMidnight('2026-09-10'), 25, 5)).toEqual(spMidnight('2026-10-05'));
  });

  it('moves a purchase on or after closing to the next invoice', () => {
    expect(invoiceDueDate(spMidnight('2026-09-25'), 25, 5)).toEqual(spMidnight('2026-11-05'));
    expect(invoiceDueDate(spMidnight('2026-09-28'), 25, 5)).toEqual(spMidnight('2026-11-05'));
  });

  it('keeps the due date in the closing month when due day is after closing day', () => {
    expect(invoiceDueDate(spMidnight('2026-09-01'), 3, 10)).toEqual(spMidnight('2026-09-10'));
    expect(invoiceDueDate(spMidnight('2026-09-05'), 3, 10)).toEqual(spMidnight('2026-10-10'));
  });

  it('clamps the due day to the end of short months', () => {
    expect(invoiceDueDate(spMidnight('2026-01-10'), 15, 31)).toEqual(spMidnight('2026-01-31'));
    expect(invoiceDueDate(spMidnight('2026-01-20'), 15, 31)).toEqual(spMidnight('2026-02-28'));
  });

  it('crosses the year boundary', () => {
    expect(invoiceDueDate(spMidnight('2026-12-28'), 25, 5)).toEqual(spMidnight('2027-02-05'));
  });
});

describe('billingDateFor', () => {
  it('keeps the transaction date for checking accounts', () => {
    const date = spMidnight('2026-09-10');
    expect(billingDateFor({ type: 'checking', closingDay: null, dueDay: null }, date)).toBe(date);
  });
});
