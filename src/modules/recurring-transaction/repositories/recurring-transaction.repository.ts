import { and, count, eq, getTableColumns, gt, isNull, lte, ne, or } from 'drizzle-orm';
import { db } from '@infra/db';
import {
  accounts,
  recurringTransactions,
  type NewRecurringTransaction,
  type RecurringTransaction,
} from '@infra/db/schema';
import {
  PaginationHelper,
  type PaginationQuery,
  type PaginationResult,
} from '@core/helpers/pagination';
import type { IRecurringTransactionRepository } from './IRecurringTransactionRepository';

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

  /**
   * Reserva a execução pendente: só avança se nextExecution ainda é o lido. Duas execuções
   * concorrentes (cron e criação, ou dois crons) leem o mesmo valor; só uma consegue avançar.
   */
  async claimExecution(
    recurring: Pick<
      RecurringTransaction,
      'id' | 'nextExecution' | 'executedInstallments' | 'totalInstallments'
    >,
    nextExecution: Date
  ): Promise<boolean> {
    const executed = recurring.executedInstallments + 1;
    const exhausted =
      recurring.totalInstallments !== null && executed >= recurring.totalInstallments;
    const rows = await db
      .update(recurringTransactions)
      .set({
        nextExecution,
        executedInstallments: executed,
        isActive: !exhausted,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recurringTransactions.id, recurring.id),
          eq(recurringTransactions.isActive, true),
          eq(recurringTransactions.nextExecution, recurring.nextExecution)
        )
      )
      .returning({ id: recurringTransactions.id });
    return rows.length > 0;
  },

  async releaseExecution(
    recurring: Pick<RecurringTransaction, 'id' | 'nextExecution' | 'executedInstallments'>
  ): Promise<void> {
    await db
      .update(recurringTransactions)
      .set({
        nextExecution: recurring.nextExecution,
        executedInstallments: recurring.executedInstallments,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(recurringTransactions.id, recurring.id));
  },

  async moveToDefaultAccount(userId: string, accountId: string): Promise<void> {
    await db
      .update(recurringTransactions)
      .set({ accountId: null, updatedAt: new Date() })
      .where(
        and(
          eq(recurringTransactions.userId, userId),
          eq(recurringTransactions.accountId, accountId)
        )
      );
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

  // Sem as do cartão: o que vence é a fatura, lembrada à parte.
  async findUpcomingExpenses(from: Date, to: Date): Promise<RecurringTransaction[]> {
    return db
      .select(getTableColumns(recurringTransactions))
      .from(recurringTransactions)
      .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
      .where(
        and(
          or(isNull(accounts.id), ne(accounts.type, 'credit_card')),
          eq(recurringTransactions.isActive, true),
          eq(recurringTransactions.type, 'expense'),
          gt(recurringTransactions.nextExecution, from),
          lte(recurringTransactions.nextExecution, to)
        )
      )
      .orderBy(recurringTransactions.nextExecution);
  },
} satisfies IRecurringTransactionRepository;

export type { IRecurringTransactionRepository };
