import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  userCategoryPreferences,
  type NewUserCategoryPreference,
} from "../db/schema";

// Implementa IUserCategoryPreferencesRepository (métodos estáticos)
export class UserCategoryPreferencesRepository {
  static async create(preferenceData: NewUserCategoryPreference) {
    const [preference] = await db
      .insert(userCategoryPreferences)
      .values(preferenceData)
      .returning();
    return preference;
  }

  static async findByUserId(userId: string) {
    const preferences = await db
      .select()
      .from(userCategoryPreferences)
      .where(eq(userCategoryPreferences.userId, userId));
    return preferences;
  }

  static async findByUserIdAndCategoryId(userId: string, categoryId: string) {
    const preferences = await db
      .select()
      .from(userCategoryPreferences)
      .where(
        and(
          eq(userCategoryPreferences.userId, userId),
          eq(userCategoryPreferences.categoryId, categoryId)
        )
      );
    return preferences[0] || null;
  }

  static async updateVisibility(
    userId: string,
    categoryId: string,
    isVisible: boolean
  ) {
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
  }

  static async delete(userId: string, categoryId: string) {
    await db
      .delete(userCategoryPreferences)
      .where(
        and(
          eq(userCategoryPreferences.userId, userId),
          eq(userCategoryPreferences.categoryId, categoryId)
        )
      );
  }

  static async createDefaultPreferencesForUser(
    userId: string,
    globalCategoryIds: string[]
  ) {
    const preferencesToInsert = globalCategoryIds.map((categoryId) => ({
      userId,
      categoryId,
      isVisible: true,
    }));

    const insertedPreferences = await db
      .insert(userCategoryPreferences)
      .values(preferencesToInsert)
      .returning();

    return insertedPreferences;
  }
}
