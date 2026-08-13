import { logger } from '@core/lib/logger';
import type { NewNotification, Notification } from '@infra/db/schema';
import { notificationRepository } from '../repositories/notification.repository';
import { sendPushToUser } from '../services/push.service';
import { resolvePushVisual } from '../helpers/push-visual';

type NotificationInput = Omit<NewNotification, 'id' | 'createdAt'>;

/**
 * Cria a notificação in-app (idempotente via dedupeKey) e dispara o push.
 * Retorna null quando a notificação já existia — nesse caso nada é enviado,
 * o que mantém o push tão idempotente quanto o registro no banco.
 */
export const dispatchNotification = async (
  data: NotificationInput
): Promise<Notification | null> => {
  const existing = await notificationRepository.findByDedupeKey(data.dedupeKey);
  if (existing) return null;

  let created: Notification;
  try {
    created = await notificationRepository.create(data);
  } catch (error) {
    // Apenas corrida do scheduler: unique(dedupeKey) violado (pg 23505).
    // Demais erros precisam propagar.
    const code = (error as { code?: string } | null)?.code;
    if (code === '23505') {
      logger.warn('[notifications] dedupe race skipped', { dedupeKey: data.dedupeKey });
      return null;
    }
    throw error;
  }

  const visual = resolvePushVisual(created.type, created.relatedId);

  await sendPushToUser(created.userId, {
    title: created.title,
    body: created.message,
    url: visual.url,
    icon: visual.icon,
    image: visual.image,
    badge: visual.badge,
    notificationId: created.id,
    type: created.type,
    relatedId: created.relatedId ?? undefined,
  });

  return created;
};
