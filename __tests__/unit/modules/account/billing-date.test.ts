import { spMidnight } from '@core/helpers/dates';
import {
  billingDateFor,
  dueDateInPeriod,
  invoiceDueDate,
  nearestDueDate,
  nextDueDate,
} from '@modules/account/helpers/billing-date';

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

describe('bill due dates', () => {
  it('finds the due date inside a period that crosses the month', () => {
    expect(dueDateInPeriod(5, spMidnight('2026-09-20'), spMidnight('2026-10-19'))).toEqual(
      spMidnight('2026-10-05')
    );
    expect(dueDateInPeriod(25, spMidnight('2026-09-20'), spMidnight('2026-10-19'))).toEqual(
      spMidnight('2026-09-25')
    );
  });

  it('pairs a payment with the closest due date, before or after it', () => {
    expect(nearestDueDate(5, spMidnight('2026-10-03'))).toEqual(spMidnight('2026-10-05'));
    expect(nearestDueDate(5, spMidnight('2026-10-08'))).toEqual(spMidnight('2026-10-05'));
    expect(nearestDueDate(30, spMidnight('2026-10-02'))).toEqual(spMidnight('2026-09-30'));
  });

  it('returns the next due date, counting today', () => {
    expect(nextDueDate(21, spMidnight('2026-10-21'))).toEqual(spMidnight('2026-10-21'));
    expect(nextDueDate(5, spMidnight('2026-10-21'))).toEqual(spMidnight('2026-11-05'));
    expect(nextDueDate(31, spMidnight('2027-02-10'))).toEqual(spMidnight('2027-02-28'));
  });
});
