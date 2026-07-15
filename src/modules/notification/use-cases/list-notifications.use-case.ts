import { PaginationHelper } from '../../../core/helpers/pagination';
import { requireUser } from '../../user';
import { notificationRepository } from '../repositories/notification.repository';

export const listNotificationsUseCase = async (
  userId: string,
  pagination: { page?: number; limit?: number },
  unreadOnly = false
) => {
  await requireUser(userId);
  const query = PaginationHelper.validateAndParse(pagination);
  return notificationRepository.findByUserPaginated(userId, query, unreadOnly);
};
