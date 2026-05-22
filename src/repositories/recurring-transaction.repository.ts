import { and, count, eq, lte } from 'drizzle-orm';
import { db } from '../db';
import {
  recurringTransactions,
  type NewRecurringTransaction,
  type RecurringTransaction,
} from '../db/schema';
import {
  PaginationHelper,
  type PaginationQuery,
  type PaginationResult,
} from '../helpers/pagination';
import type { IRecurringTransactionRepository } from './interfaces/IRecurringTransactionRepository';

export const recurringTransactionRepository = {
  async create(
    data: Omit<NewRecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RecurringTransaction> {
    const [recurring] = await db.insert(recurringTransactions).values(data).returning();
    if (!recurring) throw new Error('Falha ao criar transação recorrente');
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

  async findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery,
    includeInactive = false
  ): Promise<PaginationResult<RecurringTransaction>> {
    const conditions = [eq(recurringTransactions.userId, userId)];
    if (!includeInactive) conditions.push(eq(recurringTransactions.isActive, true));

    const totalResult = await db
      .select({ value: count() })
      .from(recurringTransactions)
      .where(and(...conditions));
    const total = totalResult[0]?.value ?? 0;

    const data = await db
      .select()
      .from(recurringTransactions)
      .where(and(...conditions))
      .orderBy(recurringTransactions.nextExecution)
      .limit(pagination.limit)
      .offset(pagination.offset);

    const page = Math.floor(pagination.offset / pagination.limit) + 1;
    return PaginationHelper.createPaginationResult(data, total, page, pagination.limit);
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
      .where(
        and(eq(recurringTransactions.isActive, true), lte(recurringTransactions.nextExecution, now))
      );
  },

  async update(
    id: string,
    userId: string,
    data: Partial<Omit<NewRecurringTransaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
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

  async incrementExecutedInstallments(id: string): Promise<RecurringTransaction | null> {
    const [current] = await db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.id, id))
      .limit(1);
    if (!current) return null;

    const [updated] = await db
      .update(recurringTransactions)
      .set({ executedInstallments: current.executedInstallments + 1, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, id))
      .returning();
    return updated ?? null;
  },

  async deactivateById(id: string): Promise<boolean> {
    const result = await db
      .update(recurringTransactions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, id))
      .returning();
    return result.length > 0;
  },

  async reactivate(
    id: string,
    userId: string,
    nextExecution: Date
  ): Promise<RecurringTransaction | null> {
    const [updated] = await db
      .update(recurringTransactions)
      .set({ isActive: true, nextExecution, updatedAt: new Date() })
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning();
    return updated ?? null;
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

  async findAllActive(): Promise<RecurringTransaction[]> {
    return db.select().from(recurringTransactions).where(eq(recurringTransactions.isActive, true));
  },
} satisfies IRecurringTransactionRepository;

export type { IRecurringTransactionRepository };
