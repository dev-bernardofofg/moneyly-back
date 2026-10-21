import { formatCents } from '@core/helpers/amount';
import { formatBrazilianDate, formatIsoDateSaoPaulo, spMidnight } from '@core/helpers/dates';
import { logger } from '@core/lib/logger';
import { nextDueDate } from '@modules/account/helpers/billing-date';
import { accountRepository } from '@modules/account/repositories/account.repository';
import { cardBillPaymentRepository } from '@modules/account/repositories/card-bill-payment.repository';
import { billTotal } from '@modules/account/use-cases/card-bill-payment.use-cases';
import { dispatchNotification } from './dispatch-notification.use-case';

const REMINDER_WINDOW_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Lembra a fatura do cartão que vence nos próximos REMINDER_WINDOW_DAYS dias enquanto não
 * estiver paga e tiver valor. Idempotente por cartão e vencimento (dedupeKey).
 */
export const processCardBillReminders = async (): Promise<void> => {
  const today = spMidnight(new Date());
  const cards = await accountRepository.findActiveCards();

  for (const card of cards) {
    try {
      const dueDate = nextDueDate(card.dueDay!, today);
      const daysUntil = Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);
      if (daysUntil > REMINDER_WINDOW_DAYS) continue;

      const payments = await cardBillPaymentRepository.findByAccountIds(card.userId, [card.id]);
      if (payments.some((payment) => payment.dueDate.getTime() === dueDate.getTime())) continue;

      const total = await billTotal(card.userId, card.id, dueDate);
      if (total <= 0) continue;

      const when =
        daysUntil === 0
          ? 'vence hoje'
          : `vence em ${daysUntil} ${daysUntil === 1 ? 'dia' : 'dias'}`;
      await dispatchNotification({
        userId: card.userId,
        type: 'bill_reminder',
        severity: daysUntil === 0 ? 'warning' : 'info',
        title: `Fatura a vencer: ${card.name}`,
        message: `A fatura do ${card.name} de R$ ${formatCents(total)} ${when} (${formatBrazilianDate(dueDate)}).`,
        relatedId: card.id,
        periodId: null,
        dedupeKey: `card-bill:${card.id}:${formatIsoDateSaoPaulo(dueDate)}`,
        isRead: false,
      });
    } catch (error) {
      logger.error(`[notifications] card bill reminder failed for ${card.id}`, error as Error);
    }
  }
};
