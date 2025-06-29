import { eq } from "drizzle-orm";
import { db } from "../db";
import { categories as categoriesTable, type NewCategory } from "../db/schema";

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
}
