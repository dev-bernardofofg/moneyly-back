import { sumAmounts } from '@core/helpers/amount';
import { spMidnight, spMidnightPlusDays, spParts } from '@core/helpers/dates';
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
    const after = account?.dataThrough ?? today;

    return (
      occurrencesBetween(rec, after, windowEnd)
        // O passo para trás de occurrencesBetween não conhece o início da recorrência.
        .filter((date) => !rec.startDate || date.getTime() >= rec.startDate.getTime())
        .map((date) => ({ type: rec.type, amount: rec.amount, date, account }))
    );
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

  const [openPeriods, payments] = await Promise.all([
    transactionRepository.sumCardExpensesByPeriod(userId, cardIds, today),
    cardBillPaymentRepository.findByAccountIds(userId, cardIds),
  ]);

  const imported = openPeriods.flatMap(({ accountId, startDate, endDate, total }) => {
    const due = dueDateInPeriod(accountById.get(accountId)!.dueDay!, startDate, endDate);
    return due ? [{ accountId, due, amount: total }] : [];
  });

  const isPaid = (accountId: string, due: Date) =>
    payments.some((row) => row.accountId === accountId && row.dueDate.getTime() === due.getTime());

  // Fatura vencida fica fora, como no limite do cartão: sem marcação, o histórico contaria tudo.
  const openBills = [...imported, ...onCard].filter(
    ({ accountId, due }) => due.getTime() >= today.getTime() && !isPaid(accountId, due)
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
