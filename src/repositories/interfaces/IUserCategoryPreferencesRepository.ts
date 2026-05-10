import type { NewUserCategoryPreference, UserCategoryPreference } from "../../db/schema";

export interface IUserCategoryPreferencesRepository {
  create(data: NewUserCategoryPreference): Promise<UserCategoryPreference | undefined>;
  findByUserId(userId: string): Promise<UserCategoryPreference[]>;
  findByUserIdAndCategoryId(userId: string, categoryId: string): Promise<UserCategoryPreference | null>;
  updateVisibility(userId: string, categoryId: string, isVisible: boolean): Promise<UserCategoryPreference | undefined>;
  delete(userId: string, categoryId: string): Promise<void>;
  createDefaultPreferencesForUser(userId: string, globalCategoryIds: string[]): Promise<UserCategoryPreference[]>;
}
