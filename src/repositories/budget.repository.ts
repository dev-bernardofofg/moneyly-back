import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { budgets, categories, NewCategoryBudget, type CategoryBudget } from '../db/schema';
import type { IBudgetRepository } from './interfaces/IBudgetRepository';

export const budgetRepository = {
  async create(data: NewCategoryBudget): Promise<CategoryBudget> {
    const [budget] = await db.insert(budgets).values(data).returning();
    if (!budget) throw new Error('Falha ao criar orçamento');
    return budget;
  },

  async findByUserId(userId: string): Promise<CategoryBudget[]> {
    return db.select().from(budgets).where(eq(budgets.userId, userId));
  },

  async findByCategoryId(categoryId: string): Promise<CategoryBudget | null> {
    const [budget] = await db.select().from(budgets).where(eq(budgets.categoryId, categoryId));
    return budget ?? null;
  },

  async findByUserIdAndCategoryId(
    userId: string,
    categoryId: string
  ): Promise<CategoryBudget | null> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.categoryId, categoryId)));
    return budget ?? null;
  },

  async findByIdAndUserId(id: string, userId: string): Promise<CategoryBudget | null> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    return budget ?? null;
  },

  async update(id: string, data: Partial<NewCategoryBudget>): Promise<CategoryBudget | null> {
    const [budget] = await db
      .update(budgets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(budgets.id, id))
      .returning();
    return budget ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id)).returning();
    return result.length > 0;
  },

  async getBudgetWithCategory(userId: string) {
    return db
      .select({
        id: budgets.id,
        monthlyLimit: budgets.monthlyLimit,
        category: { id: categories.id, name: categories.name },
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.userId, userId));
  },
} satisfies IBudgetRepository;

export type { IBudgetRepository };
