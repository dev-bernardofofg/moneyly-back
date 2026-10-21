import { spMidnight } from '@core/helpers/dates';
import { buildOpeningBalances } from '@modules/overview/helpers/carry-over';

const checking = (id: string, balance: number, date: string | null) => ({
  id,
  type: 'checking' as const,
  openingBalance: balance.toFixed(2),
  openingBalanceDate: date ? spMidnight(date) : null,
});
const card = {
  id: 'card',
  type: 'credit_card' as const,
  openingBalance: '0',
  openingBalanceDate: null,
};
const flow = (accountId: string, type: 'income' | 'expense', amount: number, date: string) => ({
  accountId,
  type,
  amount: amount.toFixed(2),
  date: spMidnight(date),
});

describe('buildOpeningBalances', () => {
  it('changes nothing when no opening balance is set', () => {
    const balances = buildOpeningBalances(
      [checking('main', 0, null), card],
      spMidnight('2026-10-31')
    );

    expect(balances.since).toBeNull();
    expect(balances.counts(flow('main', 'expense', 10, '2020-01-01'))).toBe(true);
    expect(balances.carryOver([])).toBe(0);
  });

  it('carries the opening balance plus later flows from previous periods', () => {
    const balances = buildOpeningBalances(
      [checking('main', 1000, '2026-09-01'), card],
      spMidnight('2026-10-31')
    );

    expect(
      balances.carryOver([
        flow('main', 'expense', 50, '2026-08-20'), // antes do saldo: já está nele
        flow('main', 'income', 300, '2026-09-05'),
        flow('card', 'expense', 120, '2026-09-10'),
      ])
    ).toBe(1180);
  });

  it('ignores transactions dated before the opening balance in the current period', () => {
    const balances = buildOpeningBalances(
      [checking('main', 500, '2026-10-10')],
      spMidnight('2026-10-31')
    );

    expect(balances.counts(flow('main', 'expense', 10, '2026-10-05'))).toBe(false);
    expect(balances.counts(flow('main', 'expense', 10, '2026-10-10'))).toBe(true);
  });

  it('does not apply an opening balance dated after the period', () => {
    const balances = buildOpeningBalances(
      [checking('main', 500, '2026-11-02')],
      spMidnight('2026-10-31')
    );

    expect(balances.since).toBeNull();
    expect(balances.carryOver([])).toBe(0);
    expect(balances.counts(flow('main', 'expense', 10, '2026-10-05'))).toBe(true);
  });

  it('uses each checking account cutoff and the earliest one for cards', () => {
    const balances = buildOpeningBalances(
      [checking('a', 100, '2026-09-01'), checking('b', 200, '2026-10-01'), card],
      spMidnight('2026-10-31')
    );

    expect(balances.counts(flow('b', 'expense', 10, '2026-09-15'))).toBe(false);
    expect(balances.counts(flow('a', 'expense', 10, '2026-09-15'))).toBe(true);
    expect(balances.counts(flow('card', 'expense', 10, '2026-09-15'))).toBe(true);
    expect(balances.counts(flow('card', 'expense', 10, '2026-08-15'))).toBe(false);
  });
});
