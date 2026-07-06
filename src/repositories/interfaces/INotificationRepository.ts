import type { NewNotification, Notification } from '../../db/schema';
import type { PaginationQuery, PaginationResult } from '../../helpers/pagination';

export interface INotificationRepository {
  create(data: Omit<NewNotification, 'id' | 'createdAt'>): Promise<Notification>;
  findByDedupeKey(dedupeKey: string): Promise<Notification | null>;
  findByUserPaginated(
    userId: string,
    pagination: PaginationQuery,
    unreadOnly?: boolean
  ): Promise<PaginationResult<Notification>>;
  markRead(id: string, userId: string): Promise<Notification | null>;
  markAllRead(userId: string): Promise<number>;
}
