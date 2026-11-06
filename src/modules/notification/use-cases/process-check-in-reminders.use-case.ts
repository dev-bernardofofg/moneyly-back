import { formatIsoDateSaoPaulo, spMidnight } from '@core/helpers/dates';
import { logger } from '@core/lib/logger';
import { accountFreshness } from '@modules/account/helpers/freshness';
import { accountRepository } from '@modules/account/repositories/account.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { dispatchNotification } from './dispatch-notification.use-case';

const REMINDER_INTERVAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Lembra o check-in quando alguma conta ativa está atrasada ou sem dados e nenhum lembrete
 * saiu nos últimos REMINDER_INTERVAL_DAYS dias. Um lembrete por usuário.
 */
export const processCheckInReminders = async (): Promise<void> => {
  const now = new Date();
  const today = spMidnight(now);
  const accounts = await accountRepository.findAllActive();

  const behindByUser = new Map<string, number>();
  for (const account of accounts) {
    const behind = accountFreshness(account.dataThrough, today) !== 'fresh';
    behindByUser.set(account.userId, (behindByUser.get(account.userId) ?? 0) + (behind ? 1 : 0));
  }

  for (const [userId, behind] of behindByUser) {
    if (behind === 0) continue;

    try {
      const last = await notificationRepository.findLatestByType(userId, 'check_in_reminder');
      if (last && now.getTime() - last.createdAt.getTime() < REMINDER_INTERVAL_DAYS * DAY_MS) {
        continue;
      }

      const subject = behind === 1 ? '1 conta está' : `${behind} contas estão`;
      await dispatchNotification({
        userId,
        type: 'check_in_reminder',
        severity: 'info',
        title: 'Hora do check-in',
        message: `${subject} com dados desatualizados. Envie os arquivos para atualizar seu saldo.`,
        relatedId: null,
        periodId: null,
        dedupeKey: `check-in:${userId}:${formatIsoDateSaoPaulo(today)}`,
        isRead: false,
      });
    } catch (error) {
      logger.error(`[notifications] check-in reminder failed for ${userId}`, error as Error);
    }
  }
};
