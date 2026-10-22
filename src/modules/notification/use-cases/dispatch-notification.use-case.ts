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

  // Corrida do scheduler: a outra execução gravou entre a checagem e o insert.
  const created = await notificationRepository.create(data);
  if (!created) return null;

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
