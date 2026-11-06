import { sumAmounts } from '@core/helpers/amount';
import { spMidnight, spMidnightPlusDays, spParts } from '@core/helpers/dates';
import type { Account } from '@infra/db/schema';
import { billingDateFor, dueDateInPeriod } from '@modules/account/helpers/billing-date';
import { cardBillPaymentRepository } from '@modules/account/repositories/card-bill-payment.repository';
import { listAccountsUseCase } from '@modules/account/use-cases/account.use-cases';
import { financialPeriodService } from '@modules/financial-period';
import { overtimeRepository } from '@modules/overtime/repositories/overtime.repository';
import {
  findSalary,
  occurrencesBetween,
  overtimeMonthForSalary,
} from '@modules/recurring-transaction/helpers/occurrences';
import { recurringTransactionRepository } from '@modules/recurring-transaction/repositories/recurring-transaction.repository';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { requireUser } from '@modules/user';
import {
  calculateFreeBalance,
  getFreeBalanceConfidence,
  type ForecastConfidence,
} from '../helpers/free-balance';

export type FreeBalance = {
  total: number;
  until: string;
  confidence: ForecastConfidence;
  components: {
    accountsBalance: number;
    otherIncome: number;
    recurringExpense: number;
    cardBills: number;
  };
  nextPayment: { date: string; salary: number; overtime: number; total: number } | null;
  committedAfter: number;
};

const nextDay = (date: Date) => {
  const { year, month, day } = spParts(date);
  return spMidnightPlusDays(year, month, day, 1);
};

// Data até onde o dinheiro real é conhecido: sem cobertura, vale hoje.
const checkingCoverage = (
  checking: Pick<Account, 'dataThrough' | 'openingBalanceDate'>[],
  today: Date
) => {
  const dates = checking.flatMap(({ dataThrough, openingBalanceDate }) =>
    [dataThrough, openingBalanceDate].flatMap((date) => (date ? [date.getTime()] : []))
  );
  return dates.length > 0 ? new Date(Math.max(...dates)) : today;
};

// Saldo informado já contém o que aconteceu até a data dele, mesmo além do extrato importado.
const predictedAfter = (
  account: Pick<Account, 'type' | 'dataThrough' | 'openingBalanceDate'> | undefined,
  today: Date
) => {
  const covered = account?.dataThrough ?? today;
  const opening = account?.type === 'checking' ? account.openingBalanceDate : null;
  return opening && opening.getTime() > covered.getTime() ? opening : covered;
};

const getWindow = async (userId: string, salaryDate?: Date) => {
  if (salaryDate) return { until: salaryDate, end: salaryDate };
  const period = await financialPeriodService.ensureCurrentPeriodExists(userId);
  const until = new Date(period.endDate);
  return { until, end: nextDay(until) };
};

const getNextPayment = async (
  userId: string,
  { date, recurrence }: { date: Date; recurrence: { amount: number } }
) => {
  const overtime = sumAmounts(
    await overtimeRepository.findByUserId(userId, overtimeMonthForSalary(date))
  );
  return {
    date: date.toISOString(),
    salary: recurrence.amount,
    overtime,
    total: recurrence.amount + overtime,
  };
};

export const getFreeBalanceUseCase = async (userId: string): Promise<FreeBalance> => {
  await requireUser(userId);

  const today = spMidnight(new Date());
  const [accounts, recurrences] = await Promise.all([
    listAccountsUseCase(userId),
    recurringTransactionRepository.findByUserId(userId),
  ]);

  const salary = findSalary(recurrences, today);
  const { until, end: windowEnd } = await getWindow(userId, salary?.date);

  const checking = accounts.filter((account) => account.type === 'checking');
  const cards = accounts.filter((account) => account.type === 'credit_card');
  const cardIds = cards.map((card) => card.id);
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const defaultAccount = accounts.find((account) => account.isDefault);

  const predicted = recurrences.flatMap((rec) => {
    const account = (rec.accountId && accountById.get(rec.accountId)) || defaultAccount;

    return occurrencesBetween(rec, predictedAfter(account, today), windowEnd).map((date) => ({
      type: rec.type,
      amount: rec.amount,
      date,
      account,
    }));
  });

  const onCard = predicted.flatMap(({ type, amount, date, account }) =>
    type === 'expense' && account?.type === 'credit_card'
      ? [{ accountId: account.id, due: billingDateFor(account, date), amount }]
      : []
  );
  const otherIncome = sumAmounts(predicted.filter(({ type }) => type === 'income'));
  const recurringExpense = sumAmounts(
    predicted.filter(({ type, account }) => type === 'expense' && account?.type !== 'credit_card')
  );

  const coverage = checkingCoverage(checking, today);
  // Fatura vencida depois da cobertura pode ser de período já encerrado.
  const periodsEndingFrom = coverage.getTime() < today.getTime() ? coverage : today;

  const [openPeriods, payments] = await Promise.all([
    transactionRepository.sumCardExpensesByPeriod(userId, cardIds, periodsEndingFrom),
    cardBillPaymentRepository.findByAccountIds(userId, cardIds),
  ]);

  const imported = openPeriods.flatMap(({ accountId, startDate, endDate, total }) => {
    const due = dueDateInPeriod(accountById.get(accountId)!.dueDay!, startDate, endDate);
    return due ? [{ accountId, due, amount: total }] : [];
  });

  const isPaid = (accountId: string, due: Date) =>
    payments.some((row) => row.accountId === accountId && row.dueDate.getTime() === due.getTime());

  // Vencida conta até o extrato alcançar o vencimento: antes disso o dinheiro ainda está no saldo.
  // Depois fica fora, porque o histórico pode não ter marcação de pagamento.
  const isOpen = (due: Date) =>
    due.getTime() >= today.getTime() || due.getTime() > coverage.getTime();
  const openBills = [...imported, ...onCard].filter(
    ({ accountId, due }) => isOpen(due) && !isPaid(accountId, due)
  );
  const cardBills = sumAmounts(openBills.filter(({ due }) => due.getTime() < windowEnd.getTime()));
  const committedAfter = sumAmounts(
    openBills.filter(({ due }) => due.getTime() >= windowEnd.getTime())
  );

  const accountsBalance = checking.reduce(
    (total, account) => total + (account.currentBalance ?? 0),
    0
  );

  return {
    total: calculateFreeBalance({ accountsBalance, otherIncome, recurringExpense, cardBills }),
    until: until.toISOString(),
    confidence: getFreeBalanceConfidence({
      accounts: [
        ...checking.map(({ freshness, currentBalance }) => ({
          freshness,
          hasOpeningBalance: currentBalance !== null,
        })),
        ...cards.map(({ freshness }) => ({ freshness, hasOpeningBalance: true })),
      ],
      hasSalary: salary !== null,
    }),
    components: { accountsBalance, otherIncome, recurringExpense, cardBills },
    nextPayment: salary ? await getNextPayment(userId, salary) : null,
    committedAfter,
  };
};
