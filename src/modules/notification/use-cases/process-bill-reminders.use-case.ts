import {
  formatBrazilianDate,
  formatIsoDateSaoPaulo,
  getCurrentSaoPauloDate,
} from '@core/helpers/dates';
import { recurringTransactionRepository } from '@modules/recurring-transaction';
import { dispatchNotification } from './dispatch-notification.use-case';

const REMINDER_WINDOW_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatAmount(amount: string): string {
  return Number(amount).toFixed(2).replace('.', ',');
}

/**
 * Gera lembretes de contas a vencer: despesas recorrentes ativas com
 * nextExecution nos próximos REMINDER_WINDOW_DAYS dias (idempotente via dedupeKey).
 * Quando a recorrente executa, nextExecution avança e a próxima ocorrência
 * gera um dedupeKey novo naturalmente.
 */
export const processBillReminders = async (): Promise<void> => {
  const now = getCurrentSaoPauloDate();
  const until = new Date(now.getTime() + REMINDER_WINDOW_DAYS * DAY_MS);

  const upcoming = await recurringTransactionRepository.findUpcomingExpenses(now, until);

  for (const recurring of upcoming) {
    const dedupeKey = `bill:${recurring.id}:${formatIsoDateSaoPaulo(recurring.nextExecution)}`;

    const daysUntil = Math.max(
      1,
      Math.ceil((recurring.nextExecution.getTime() - now.getTime()) / DAY_MS)
    );
    const dayLabel = daysUntil === 1 ? 'dia' : 'dias';

    await dispatchNotification({
      userId: recurring.userId,
      type: 'bill_reminder',
      severity: 'info',
      title: `Conta a vencer: ${recurring.title}`,
      message: `${recurring.title} de R$ ${formatAmount(recurring.amount)} vence em ${daysUntil} ${dayLabel} (${formatBrazilianDate(recurring.nextExecution)}).`,
      relatedId: recurring.id,
      periodId: null,
      dedupeKey,
      isRead: false,
    });
  }
};
