import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import {
  userCategoryPreferences,
  type NewUserCategoryPreference,
  type UserCategoryPreference,
} from '../db/schema';
import type { IUserCategoryPreferencesRepository } from './interfaces/IUserCategoryPreferencesRepository';

export const userCategoryPreferencesRepository = {
  async create(data: NewUserCategoryPreference): Promise<UserCategoryPreference | undefined> {
    const [preference] = await db.insert(userCategoryPreferences).values(data).returning();
    return preference;
  },

  async findByUserId(userId: string): Promise<UserCategoryPreference[]> {
    return db
      .select()
      .from(userCategoryPreferences)
      .where(eq(userCategoryPreferences.userId, userId));
  },

  async findByUserIdAndCategoryId(
    userId: string,
    categoryId: string
  ): Promise<UserCategoryPreference | null> {
    const [preference] = await db
      .select()
      .from(userCategoryPreferences)
      .where(
        and(
          eq(userCategoryPreferences.userId, userId),
          eq(userCategoryPreferences.categoryId, categoryId)
        )
      );
    return preference ?? null;
  },

  async updateVisibility(
    userId: string,
    categoryId: string,
    isVisible: boolean
  ): Promise<UserCategoryPreference | undefined> {
    const [preference] = await db
      .update(userCategoryPreferences)
      .set({ isVisible, updatedAt: new Date() })
      .where(
        and(
          eq(userCategoryPreferences.userId, userId),
          eq(userCategoryPreferences.categoryId, categoryId)
        )
      )
      .returning();
    return preference;
  },

  async delete(userId: string, categoryId: string): Promise<void> {
    await db
      .delete(userCategoryPreferences)
      .where(
        and(
          eq(userCategoryPreferences.userId, userId),
          eq(userCategoryPreferences.categoryId, categoryId)
        )
      );
  },

  async createDefaultPreferencesForUser(
    userId: string,
    globalCategoryIds: string[]
  ): Promise<UserCategoryPreference[]> {
    const preferencesToInsert = globalCategoryIds.map((categoryId) => ({
      userId,
      categoryId,
      isVisible: true,
    }));
    return db.insert(userCategoryPreferences).values(preferencesToInsert).returning();
  },
} satisfies IUserCategoryPreferencesRepository;

export type { IUserCategoryPreferencesRepository };
