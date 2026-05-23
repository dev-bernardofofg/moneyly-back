import type { CategoryBudget, NewCategoryBudget } from '../../db/schema';

export type BudgetWithCategory = {
  id: string;
  monthlyLimit: string | null;
  category: { id: string; name: string };
};

export interface IBudgetRepository {
  create(data: NewCategoryBudget): Promise<CategoryBudget>;
  findByUserId(userId: string): Promise<CategoryBudget[]>;
  findByCategoryId(categoryId: string): Promise<CategoryBudget | null>;
  findByUserIdAndCategoryId(userId: string, categoryId: string): Promise<CategoryBudget | null>;
  findByIdAndUserId(id: string, userId: string): Promise<CategoryBudget | null>;
  update(id: string, data: Partial<NewCategoryBudget>): Promise<CategoryBudget | null>;
  delete(id: string): Promise<boolean>;
  getBudgetWithCategory(userId: string): Promise<BudgetWithCategory[]>;
}
