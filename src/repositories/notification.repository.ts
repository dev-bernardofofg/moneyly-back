import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { notifications, type NewNotification, type Notification } from '../db/schema';
import {
  PaginationHelper,
  type PaginationQuery,
  type PaginationResult,
} from '../helpers/pagination';
import type { INotificationRepository } from './interfaces';

export const notificationRepository = {
  async create(data: Omit<NewNotification, 'id' | 'createdAt'>): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    if (!notification) throw new Error('Falha ao criar notificação');
    return notification;
  },

  async findByDedupeKey(dedupeKey: string): Promise<Notification | null> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.dedupeKey, dedupeKey))
      .limit(1);
    return notification ?? null;
  },

  async findByUserPaginated(
    userId: string,
    pagination: PaginationQuery,
    unreadOnly = false
  ): Promise<PaginationResult<Notification>> {
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) conditions.push(eq(notifications.isRead, false));

    const totalResult = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(...conditions));
    const total = totalResult[0]?.value ?? 0;

    const data = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(pagination.limit)
      .offset(pagination.offset);

    const page = Math.floor(pagination.offset / pagination.limit) + 1;
    return PaginationHelper.createPaginationResult(data, total, page, pagination.limit);
  },

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async markAllRead(userId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning();
    return result.length;
  },
} satisfies INotificationRepository;

export type { INotificationRepository };
