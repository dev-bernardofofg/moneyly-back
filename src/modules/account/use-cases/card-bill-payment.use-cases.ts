import { spMidnight, spMidnightOf, spParts } from '@core/helpers/dates';
import { NotFoundError } from '@core/errors';
import type { Account } from '@infra/db/schema';
import { financialPeriodService } from '@modules/financial-period';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { nearestDueDate } from '../helpers/billing-date';
import { accountRepository } from '../repositories/account.repository';
import { cardBillPaymentRepository } from '../repositories/card-bill-payment.repository';
import { validateActiveCard } from '../validations/account.validation';

// Data informada vira o vencimento real do cartão: o front não precisa acertar o dia exato.
const resolveDueDate = (card: Account, date: string) =>
  nearestDueDate(card.dueDay!, spMidnight(date));

export const markBillPaidUseCase = async (userId: string, accountId: string, dueDate: string) => {
  const card = await validateActiveCard(accountId, userId);
  return cardBillPaymentRepository.markManual({
    userId,
    accountId,
    dueDate: resolveDueDate(card, dueDate),
  });
};

export const unmarkBillPaidUseCase = async (userId: string, accountId: string, dueDate: string) => {
  const card = await validateActiveCard(accountId, userId);
  const removed = await cardBillPaymentRepository.remove({
    userId,
    accountId,
    dueDate: resolveDueDate(card, dueDate),
  });
  if (!removed) throw new NotFoundError('Fatura não estava marcada como paga');
};

/** Total da fatura do cartão que vence na data (compras do cartão no período do vencimento). */
export const billTotal = async (userId: string, cardId: string, dueDate: Date) => {
  const periodId = await financialPeriodService.findOrCreatePeriodForDate(userId, dueDate);
  const rows = await transactionRepository.sumExpensesByAccountAndCategory(userId, periodId, [
    cardId,
  ]);
  return rows.reduce((total, row) => total + row.total, 0);
};

interface ImportedBillPayment {
  type: 'income' | 'expense';
  amount: number;
  date: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fatura que o pagamento quita: a de total igual ao valor entre os vencimentos vizinhos; senão a
 * de vencimento mais próximo, desde que o valor cubra o total dela. Valor menor que o total é
 * pagamento parcial ou antecipação: não marca (null).
 */
const settledDueDate = async (userId: string, card: Account, payment: ImportedBillPayment) => {
  const { year, month } = spParts(payment.date);
  const dueDates = [-1, 0, 1].map((offset) => spMidnightOf(year, month + offset, card.dueDay!));
  const totals = await Promise.all(dueDates.map((due) => billTotal(userId, card.id, due)));

  const exact = dueDates.find((_, index) => totals[index] === payment.amount);
  if (exact) return exact;

  const nearest = nearestDueDate(card.dueDay!, payment.date);
  const nearestTotal =
    totals[dueDates.findIndex((due) => due.getTime() === nearest.getTime())] ?? 0;
  if (Math.abs(nearest.getTime() - payment.date.getTime()) > 20 * DAY_MS) return null;
  return payment.amount >= nearestTotal ? nearest : null;
};

/**
 * Pagamentos de fatura vindos de extrato. No extrato do cartão o cartão é o próprio; no da
 * conta corrente só dá para saber com um cartão ativo ou com o valor igual ao total de uma
 * fatura. Sem certeza, não marca: o usuário marca à mão.
 */
export const registerImportedBillPayments = async (
  userId: string,
  account: Account,
  payments: ImportedBillPayment[]
): Promise<number> => {
  let registered = 0;
  const cards =
    account.type === 'credit_card'
      ? [account]
      : (await accountRepository.findActiveByUserId(userId)).filter(
          (candidate) => candidate.type === 'credit_card'
        );

  for (const payment of payments) {
    const expectedType = account.type === 'credit_card' ? 'income' : 'expense';
    if (payment.type !== expectedType || cards.length === 0) continue;

    let card: Account | undefined;
    let dueDate: Date | null = null;
    if (cards.length === 1) {
      card = cards[0];
      dueDate = await settledDueDate(userId, card!, payment);
    } else {
      for (const candidate of cards) {
        const due = nearestDueDate(candidate.dueDay!, payment.date);
        if ((await billTotal(userId, candidate.id, due)) === payment.amount) {
          card = candidate;
          dueDate = due;
          break;
        }
      }
    }
    if (!card || !dueDate) continue;

    const marked = await cardBillPaymentRepository.markImported({
      userId,
      accountId: card.id,
      dueDate,
    });
    if (marked) registered++;
  }
  return registered;
};
