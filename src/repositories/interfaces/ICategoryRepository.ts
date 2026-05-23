import type { Category, NewCategory } from '../../db/schema';
import type { PaginationQuery, PaginationResult } from '../../helpers/pagination';

export interface ICategoryRepository {
  create(data: NewCategory): Promise<Category | undefined>;
  findByUserId(userId: string): Promise<Category[]>;
  findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery
  ): Promise<PaginationResult<Category>>;
  findByName(name: string): Promise<Category | null>;
  findByNameAndUserId(name: string, userId: string): Promise<Category | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Category | null>;
  update(id: string, data: NewCategory): Promise<Category | undefined>;
  delete(id: string, userId: string): Promise<Category[]>;
  findGlobalCategories(): Promise<Category[]>;
  createGlobalCategory(name: string): Promise<Category | undefined>;
  hideGlobalCategoryForUser(userId: string, categoryId: string): Promise<unknown>;
  showGlobalCategoryForUser(userId: string, categoryId: string): Promise<{ message: string }>;
}
