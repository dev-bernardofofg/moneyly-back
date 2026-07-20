import { HttpError } from '@core/errors/http-error';
import { notificationRepository } from '../repositories/notification.repository';

export const markNotificationReadUseCase = async (id: string, userId: string) => {
  const updated = await notificationRepository.markRead(id, userId);
  if (!updated) throw new HttpError(404, 'Notificação não encontrada');
  return updated;
};
