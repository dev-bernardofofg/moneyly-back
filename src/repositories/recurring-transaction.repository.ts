import { and, eq, lte } from "drizzle-orm";
import { db } from "../db";
import { recurringTransactions, type NewRecurringTransaction, type RecurringTransaction } from "../db/schema";
import type { IRecurringTransactionRepository } from "./interfaces/IRecurringTransactionRepository";

export const recurringTransactionRepository = {
  async create(data: Omit<NewRecurringTransaction, "id" | "createdAt" | "updatedAt">): Promise<RecurringTransaction> {
    const [recurring] = await db.insert(recurringTransactions).values(data).returning();
    if (!recurring) throw new Error("Falha ao criar transação recorrente");
    return recurring;
  },

  async findByUserId(userId: string, includeInactive = false): Promise<RecurringTransaction[]> {
    const conditions = [eq(recurringTransactions.userId, userId)];
    if (!includeInactive) conditions.push(eq(recurringTransactions.isActive, true));
    return db
      .select()
      .from(recurringTransactions)
      .where(and(...conditions))
      .orderBy(recurringTransactions.nextExecution);
  },

  async findById(id: string, userId: string): Promise<RecurringTransaction | null> {
    const [recurring] = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .limit(1);
    return recurring ?? null;
  },

  async findDueTransactions(now: Date = new Date()): Promise<RecurringTransaction[]> {
    return db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.isActive, true), lte(recurringTransactions.nextExecution, now)));
  },

  async update(
    id: string,
    userId: string,
    data: Partial<Omit<NewRecurringTransaction, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<RecurringTransaction | null> {
    const [updated] = await db
      .update(recurringTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async updateNextExecution(id: string, nextExecution: Date): Promise<boolean> {
    const result = await db
      .update(recurringTransactions)
      .set({ nextExecution, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, id))
      .returning();
    return result.length > 0;
  },

  async deactivate(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(recurringTransactions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning();
    return result.length > 0;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning();
    return result.length > 0;
  },
} satisfies IRecurringTransactionRepository;

export type { IRecurringTransactionRepository };
