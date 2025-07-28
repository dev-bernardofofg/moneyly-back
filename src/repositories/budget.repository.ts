import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  budgets,
  categories,
  NewCategoryBudget,
  type CategoryBudget,
} from "../db/schema";

export class BudgetRepository {
  static async create(data: NewCategoryBudget): Promise<CategoryBudget> {
    const [budget] = await db.insert(budgets).values(data).returning();
    return budget;
  }

  static async findByUserId(userId: string): Promise<CategoryBudget[]> {
    return await db.select().from(budgets).where(eq(budgets.userId, userId));
  }

  static async findByCategoryId(
    categoryId: string
  ): Promise<CategoryBudget | null> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.categoryId, categoryId));
    return budget || null;
  }

  static async findByIdAndUserId(
    id: string,
    userId: string
  ): Promise<CategoryBudget | null> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    return budget || null;
  }

  static async update(
    id: string,
    data: Partial<NewCategoryBudget>
  ): Promise<CategoryBudget | null> {
    const [budget] = await db
      .update(budgets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(budgets.id, id))
      .returning();
    return budget || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(budgets)
      .where(eq(budgets.id, id))
      .returning();

    // Se retornou algum registro, significa que foi deletado com sucesso
    return result.length > 0;
  }

  static async getBudgetWithCategory(userId: string): Promise<any[]> {
    return await db
      .select({
        id: budgets.id,
        monthlyLimit: budgets.monthlyLimit,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.userId, userId));
  }
}
