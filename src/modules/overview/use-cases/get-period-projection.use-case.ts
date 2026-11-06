import { sumAmounts } from '@core/helpers/amount';
import { HttpError } from '@core/errors/http-error';
import { billingDateFor } from '@modules/account/helpers/billing-date';
import { accountRepository } from '@modules/account/repositories/account.repository';
import { financialPeriodService, formatPeriodLabel } from '@modules/financial-period';
import { occurrencesBetween } from '@modules/recurring-transaction/helpers/occurrences';
import { recurringTransactionRepository } from '@modules/recurring-transaction/repositories/recurring-transaction.repository';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { transferLegs } from '@modules/transfer/helpers/transfer-legs';
import { transferRepository } from '@modules/transfer/repositories/transfer.repository';
import { requireUser } from '@modules/user';
import { buildOpeningBalances } from '../helpers/carry-over';

export interface PeriodOccurrence {
  recurringTransactionId: string;
  title: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  categoryId: string;
}

const getOccurrenceKey = (recurringTransactionId: string, date: Date | string) =>
  `${recurringTransactionId}:${new Date(date).toISOString().slice(0, 10)}`;

export const getPeriodProjectionUseCase = async (userId: string, periodId?: string) => {
  await requireUser(userId);

  const period = periodId
    ? await financialPeriodService.getPeriodById(periodId, userId)
    : await financialPeriodService.ensureCurrentPeriodExists(userId);

  if (!period) throw new HttpError(404, 'Período não encontrado');

  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);

  const [transactions, accounts, periodTransfers, recurrences] = await Promise.all([
    transactionRepository.findByPeriodId(userId, period.id),
    accountRepository.findAllByUserId(userId),
    transferRepository.findInRange(userId, startDate, endDate),
    recurringTransactionRepository.findByUserId(userId),
  ]);

  // Com saldo inicial informado, o que veio antes dele já está no saldo e não entra de novo.
  const balances = buildOpeningBalances(accounts, endDate);
  const counted = transactions.filter(balances.counts);

  const realizedIncome = sumAmounts(counted.filter((tx) => tx.type === 'income'));
  const realizedExpense = sumAmounts(counted.filter((tx) => tx.type === 'expense'));
  // Transferência não é receita nem despesa; só pesa quando uma ponta caiu antes do saldo
  // inicial da conta (já estava nele). Normalmente soma zero.
  const transfersNet = periodTransfers
    .flatMap(transferLegs)
    .filter(balances.counts)
    .reduce((total, leg) => total + (leg.type === 'income' ? leg.amount : -leg.amount), 0);

  const materializedRecurrences = new Set(
    transactions
      .filter((transaction) => transaction.recurringTransactionId)
      .map((transaction) => getOccurrenceKey(transaction.recurringTransactionId!, transaction.date))
  );

  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const defaultAccount = accounts.find((account) => account.isDefault);
  const now = new Date();
  const afterEnd = new Date(endDate.getTime() + 1);

  const occurrences: PeriodOccurrence[] = recurrences.flatMap((rec) => {
    const account = (rec.accountId && accountById.get(rec.accountId)) || defaultAccount;

    return occurrencesBetween(rec, now, afterEnd)
      .filter((date) => {
        // Cobrança no cartão pertence ao período da fatura, não ao dia da cobrança.
        const periodDate = account ? billingDateFor(account, date) : date;
        return (
          periodDate.getTime() >= startDate.getTime() &&
          periodDate.getTime() <= endDate.getTime() &&
          !materializedRecurrences.has(getOccurrenceKey(rec.id, date))
        );
      })
      .map((date) => ({
        recurringTransactionId: rec.id,
        title: rec.title,
        type: rec.type,
        amount: Number(rec.amount),
        date: date.toISOString(),
        categoryId: rec.categoryId,
      }));
  });

  return {
    period: {
      id: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      label: formatPeriodLabel(startDate, endDate),
    },
    realized: {
      income: realizedIncome,
      expense: realizedExpense,
      balance: realizedIncome - realizedExpense + transfersNet,
    },
    projected: {
      recurringIncome: sumAmounts(occurrences.filter((o) => o.type === 'income')),
      recurringExpense: sumAmounts(occurrences.filter((o) => o.type === 'expense')),
      occurrences,
    },
  };
};
