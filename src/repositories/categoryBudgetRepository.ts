import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  categories,
  CategoryBudget,
  categoryBudgets,
  NewCategoryBudget,
} from "../db/schema";

export interface ICategoryBudgetRepository {
  create(data: NewCategoryBudget): Promise<CategoryBudget>;
  findByUserId(userId: string): Promise<CategoryBudget[]>;
  findByCategoryId(categoryId: string): Promise<CategoryBudget | null>;
  findByIdAndUserId(id: string, userId: string): Promise<CategoryBudget | null>;
  update(
    id: string,
    data: Partial<NewCategoryBudget>
  ): Promise<CategoryBudget | null>;
  delete(id: string): Promise<boolean>;
  getBudgetWithCategory(userId: string): Promise<any[]>;
}

export class CategoryBudgetRepository implements ICategoryBudgetRepository {
  async create(data: NewCategoryBudget): Promise<CategoryBudget> {
    const [budget] = await db.insert(categoryBudgets).values(data).returning();
    return budget;
  }

  async findByUserId(userId: string): Promise<CategoryBudget[]> {
    return await db
      .select()
      .from(categoryBudgets)
      .where(eq(categoryBudgets.userId, userId));
  }

  async findByCategoryId(categoryId: string): Promise<CategoryBudget | null> {
    const [budget] = await db
      .select()
      .from(categoryBudgets)
      .where(eq(categoryBudgets.categoryId, categoryId));
    return budget || null;
  }

  async findByIdAndUserId(
    id: string,
    userId: string
  ): Promise<CategoryBudget | null> {
    const [budget] = await db
      .select()
      .from(categoryBudgets)
      .where(
        and(eq(categoryBudgets.id, id), eq(categoryBudgets.userId, userId))
      );
    return budget || null;
  }

  async update(
    id: string,
    data: Partial<NewCategoryBudget>
  ): Promise<CategoryBudget | null> {
    const [budget] = await db
      .update(categoryBudgets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categoryBudgets.id, id))
      .returning();
    return budget || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(categoryBudgets)
      .where(eq(categoryBudgets.id, id))
      .returning();

    // Se retornou algum registro, significa que foi deletado com sucesso
    return result.length > 0;
  }

  async getBudgetWithCategory(userId: string): Promise<any[]> {
    return await db
      .select({
        id: categoryBudgets.id,
        monthlyLimit: categoryBudgets.monthlyLimit,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(categoryBudgets)
      .innerJoin(categories, eq(categoryBudgets.categoryId, categories.id))
      .where(eq(categoryBudgets.userId, userId));
  }
}
