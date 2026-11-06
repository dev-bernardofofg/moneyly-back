import type { AccountFreshness } from '@modules/account/helpers/freshness';

export type ForecastConfidence = 'low' | 'medium' | 'high';

const roundMoney = (value: number) => Math.round(value);

export const calculateFreeBalance = (input: {
  accountsBalance: number;
  otherIncome: number;
  recurringExpense: number;
  cardBills: number;
}): number =>
  roundMoney(input.accountsBalance + input.otherIncome - input.recurringExpense - input.cardBills);

export const getFreeBalanceConfidence = (input: {
  accounts: Array<{ freshness: AccountFreshness; hasOpeningBalance: boolean }>;
  hasSalary: boolean;
}): ForecastConfidence => {
  if (!input.hasSalary) return 'low';
  if (input.accounts.length === 0 || input.accounts.some((a) => !a.hasOpeningBalance)) return 'low';
  if (input.accounts.some((a) => a.freshness !== 'fresh')) return 'medium';
  return 'high';
};

export const toMoney = roundMoney;
