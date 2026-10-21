import { spMidnight } from '@core/helpers/dates';
import { reconcile, type ReconcileCandidate } from '@modules/transaction/helpers/reconcile';

const row = (externalId: string, amount: number, date: string) => ({
  externalId,
  type: 'expense' as const,
  amount,
  date: spMidnight(date),
});
const candidate = (
  id: string,
  amount: number,
  date: string,
  extra: Partial<ReconcileCandidate> = {}
): ReconcileCandidate => ({
  id,
  type: 'expense',
  amount,
  date: spMidnight(date),
  externalId: null,
  recurringTransactionId: null,
  ...extra,
});

describe('reconcile', () => {
  it('links a row to a transaction already in the app within three days', () => {
    const matches = reconcile(
      [row('r1', 5000, '2026-09-10')],
      [candidate('t1', 5000, '2026-09-12')]
    );

    expect(matches.get('r1')).toEqual({ kind: 'existing', transactionId: 't1' });
  });

  it('ignores a different amount or a date too far away', () => {
    const matches = reconcile(
      [row('r1', 5000, '2026-09-10'), row('r2', 5000, '2026-09-20')],
      [candidate('t1', 5001, '2026-09-10'), candidate('t2', 5000, '2026-09-25')]
    );

    expect(matches.size).toBe(0);
  });

  it('accepts a recurring estimate within 10% and any date in the same bill', () => {
    const matches = reconcile(
      [row('cursor', 10500, '2026-09-10'), row('parcela', 27479, '2026-07-15')],
      [
        candidate('rec', 10400, '2026-09-01', { recurringTransactionId: 'r' }),
        candidate('inst', 27479, '2026-09-15'),
      ],
      { samePeriod: true }
    );

    expect(matches.get('cursor')).toEqual({ kind: 'existing', transactionId: 'rec' });
    expect(matches.get('parcela')).toEqual({ kind: 'existing', transactionId: 'inst' });
  });

  it('uses each transaction once and reports rows that came from another file', () => {
    const matches = reconcile(
      [row('a', 3500, '2026-09-21'), row('b', 3500, '2026-09-21'), row('c', 800, '2026-09-01')],
      [
        candidate('t1', 3500, '2026-09-21'),
        candidate('ofx', 800, '2026-09-01', { externalId: 'x' }),
      ]
    );

    expect([...matches.values()].filter((match) => match.transactionId === 't1')).toHaveLength(1);
    expect(matches.get('c')).toEqual({ kind: 'imported', transactionId: 'ofx' });
  });
});
