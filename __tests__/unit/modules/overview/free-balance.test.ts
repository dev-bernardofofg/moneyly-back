import {
  calculateFreeBalance,
  getFreeBalanceConfidence,
} from '@modules/overview/helpers/free-balance';

describe('calculateFreeBalance', () => {
  it('adds balance and other income, subtracts recurring expense and card bills', () => {
    expect(
      calculateFreeBalance({
        accountsBalance: 100000,
        otherIncome: 5000,
        recurringExpense: 20000,
        cardBills: 30000,
      })
    ).toBe(55000);
  });
});

describe('getFreeBalanceConfidence', () => {
  it('is low without opening balance', () => {
    expect(
      getFreeBalanceConfidence({
        accounts: [{ freshness: 'fresh', hasOpeningBalance: false }],
        hasSalary: true,
      })
    ).toBe('low');
  });

  it('is low without salary', () => {
    expect(
      getFreeBalanceConfidence({
        accounts: [{ freshness: 'fresh', hasOpeningBalance: true }],
        hasSalary: false,
      })
    ).toBe('low');
  });

  it('is medium with a stale account', () => {
    expect(
      getFreeBalanceConfidence({
        accounts: [{ freshness: 'stale', hasOpeningBalance: true }],
        hasSalary: true,
      })
    ).toBe('medium');
  });

  it('is high when everything is fresh', () => {
    expect(
      getFreeBalanceConfidence({
        accounts: [{ freshness: 'fresh', hasOpeningBalance: true }],
        hasSalary: true,
      })
    ).toBe('high');
  });
});
