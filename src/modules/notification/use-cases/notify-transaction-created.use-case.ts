import { formatBrazilianDate } from '@core/helpers/dates';
import type { Transaction } from '@infra/db/schema';
import { dispatchNotification } from './dispatch-notification.use-case';

const formatAmount = (amount: string): string => Number(amount).toFixed(2).replace('.', ',');

/**
 * Notifica criação de transação (entrada ou saída). Idempotente via
 * `transaction:<id>` — cada lançamento gera no máximo um push.
 */
export const notifyTransactionCreated = async (transaction: Transaction): Promise<void> => {
  const isIncome = transaction.type === 'income';
  const amount = formatAmount(transaction.amount);
  const dateLabel = formatBrazilianDate(transaction.date);

  await dispatchNotification({
    userId: transaction.userId,
    type: isIncome ? 'transaction_income' : 'transaction_expense',
    severity: 'info',
    title: isIncome ? `Entrada: ${transaction.title}` : `Saída: ${transaction.title}`,
    message: isIncome
      ? `Você registrou uma entrada de R$ ${amount} em ${dateLabel} (${transaction.title}).`
      : `Você registrou uma saída de R$ ${amount} em ${dateLabel} (${transaction.title}).`,
    relatedId: transaction.id,
    periodId: transaction.periodId,
    dedupeKey: `transaction:${transaction.id}`,
    isRead: false,
  });
};
