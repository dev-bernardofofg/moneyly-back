import { BudgetWithCategory } from "../repositories/interfaces/IBudgetRepository";

export type BudgetProgress = BudgetWithCategory & {
    spent: number;
    remaining: number;
    percentage: number;
    status: string;
};