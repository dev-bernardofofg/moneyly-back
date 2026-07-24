import { requireUser } from '@modules/user';
import { notificationRepository } from '../repositories/notification.repository';

export const markAllNotificationsReadUseCase = async (userId: string) => {
  await requireUser(userId);
  const updatedCount = await notificationRepository.markAllRead(userId);
  return { updatedCount };
};
