import { and, count, eq } from "drizzle-orm";
import { db } from "../db";
import { categories as categoriesTable, type NewCategory } from "../db/schema";
import {
  PaginationHelper,
  PaginationQuery,
  PaginationResult,
} from "../lib/pagination";

export class CategoryRepository {
  static async create(categoryData: NewCategory) {
    const [category] = await db
      .insert(categoriesTable)
      .values(categoryData)
      .returning();
    return category;
  }

  static async findByUserId(userId: string) {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId));
    return categories;
  }

  static async findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery
  ): Promise<PaginationResult<typeof categoriesTable.$inferSelect>> {
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId));

    const data = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId))
      .limit(pagination.limit)
      .offset(pagination.offset);

    const page = Math.floor(pagination.offset / pagination.limit) + 1;

    return PaginationHelper.createPaginationResult(
      data,
      total,
      page,
      pagination.limit
    );
  }

  static async findByName(name: string) {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.name, name));
    return categories[0] || null;
  }

  static async findByNameAndUserId(name: string, userId: string) {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(
        and(eq(categoriesTable.name, name), eq(categoriesTable.userId, userId))
      );
    return categories[0] || null;
  }

  static async findByIdAndUserId(id: string, userId: string) {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(
        and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId))
      );
    return categories[0] || null;
  }

  static async update(id: string, categoryData: NewCategory) {
    const [category] = await db
      .update(categoriesTable)
      .set(categoryData)
      .where(eq(categoriesTable.id, id))
      .returning();
    return category;
  }

  static async delete(id: string) {
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  }
}
