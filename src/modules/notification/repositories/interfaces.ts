import type { DeviceRegistration, NewNotification, Notification } from '@infra/db/schema';
import type { PaginationQuery, PaginationResult } from '@core/helpers/pagination';

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

export interface IDeviceRegistrationRepository {
  upsert(userId: string, fid: string, userAgent?: string): Promise<DeviceRegistration>;
  findByUser(userId: string): Promise<DeviceRegistration[]>;
  deleteByFid(userId: string, fid: string): Promise<void>;
  deleteMany(fids: string[]): Promise<void>;
}
