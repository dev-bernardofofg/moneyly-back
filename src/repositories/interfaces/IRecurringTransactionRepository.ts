import type { NewRecurringTransaction, RecurringTransaction } from "../../db/schema";

export interface IRecurringTransactionRepository {
  create(data: Omit<NewRecurringTransaction, "id" | "createdAt" | "updatedAt">): Promise<RecurringTransaction>;
  findByUserId(userId: string, includeInactive?: boolean): Promise<RecurringTransaction[]>;
  findById(id: string, userId: string): Promise<RecurringTransaction | null>;
  findDueTransactions(now?: Date): Promise<RecurringTransaction[]>;
  update(
    id: string,
    userId: string,
    data: Partial<Omit<NewRecurringTransaction, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<RecurringTransaction | null>;
  updateNextExecution(id: string, nextExecution: Date): Promise<boolean>;
  deactivate(id: string, userId: string): Promise<boolean>;
  delete(id: string, userId: string): Promise<boolean>;
}
