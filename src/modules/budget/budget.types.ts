import { BudgetWithCategory } from './repositories/IBudgetRepository';

export type BudgetProgress = BudgetWithCategory & {
  spent: number;
  remaining: number;
  percentage: number;
  status: string;
};
