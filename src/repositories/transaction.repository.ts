import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { categories, transactions, type NewTransaction, type Transaction } from '../db/schema';
import {
  PaginationHelper,
  type PaginationQuery,
  type PaginationResult,
} from '../helpers/pagination';
import type { ITransactionRepository } from './interfaces/ITransactionRepository';

export type TransactionWithCategory = Omit<Transaction, 'categoryId' | 'userId'> & {
  category: { id: string; name: string };
};

const BASE_SELECT = {
  id: transactions.id,
  periodId: transactions.periodId,
  recurringTransactionId: transactions.recurringTransactionId,
  type: transactions.type,
  title: transactions.title,
  amount: transactions.amount,
  description: transactions.description,
  date: transactions.date,
  createdAt: transactions.createdAt,
  updatedAt: transactions.updatedAt,
  category: { id: categories.id, name: categories.name },
} as const;

export const transactionRepository = {
  async create(data: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(data).returning();
    if (!transaction) throw new Error('Falha ao criar transação');
    return transaction;
  },

  async findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery,
    filters?: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
      periodId?: string;
      type?: 'income' | 'expense';
    }
  ): Promise<PaginationResult<TransactionWithCategory>> {
    const conditions = [eq(transactions.userId, userId)];
    if (filters?.category) conditions.push(eq(transactions.categoryId, filters.category));
    if (filters?.periodId) conditions.push(eq(transactions.periodId, filters.periodId));
    if (filters?.type) conditions.push(eq(transactions.type, filters.type));
    if (filters?.startDate) conditions.push(gte(transactions.date, filters.startDate));
    if (filters?.endDate) conditions.push(lte(transactions.date, filters.endDate));

    const totalResult = await db
      .select({ value: count() })
      .from(transactions)
      .where(and(...conditions));
    const total = totalResult[0]?.value ?? 0;
    const data = await db
      .select(BASE_SELECT)
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date))
      .limit(pagination.limit)
      .offset(pagination.offset);

    const page = Math.floor(pagination.offset / pagination.limit) + 1;
    return PaginationHelper.createPaginationResult(data, total, page, pagination.limit);
  },

  async findByUserId(
    userId: string,
    filters?: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
      periodId?: string;
      type?: 'income' | 'expense';
    }
  ): Promise<TransactionWithCategory[]> {
    const conditions = [eq(transactions.userId, userId)];
    if (filters?.category) conditions.push(eq(transactions.categoryId, filters.category));
    if (filters?.periodId) conditions.push(eq(transactions.periodId, filters.periodId));
    if (filters?.type) conditions.push(eq(transactions.type, filters.type));
    if (filters?.startDate) conditions.push(gte(transactions.date, filters.startDate));
    if (filters?.endDate) conditions.push(lte(transactions.date, filters.endDate));

    return db
      .select(BASE_SELECT)
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date));
  },

  async findByIdAndUserId(id: string, userId: string): Promise<Transaction | null> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return transaction ?? null;
  },

  async update(
    id: string,
    userId: string,
    updateData: Partial<Omit<NewTransaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Transaction | null> {
    const [transaction] = await db
      .update(transactions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return transaction ?? null;
  },

  async delete(id: string, userId: string): Promise<Transaction | null> {
    const [transaction] = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return transaction ?? null;
  },

  async findAllByUserId(userId: string): Promise<TransactionWithCategory[]> {
    return db
      .select({ ...BASE_SELECT, userId: transactions.userId })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  },

  async findByPeriodId(userId: string, periodId: string): Promise<TransactionWithCategory[]> {
    return db
      .select(BASE_SELECT)
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), eq(transactions.periodId, periodId)))
      .orderBy(desc(transactions.date));
  },

  async findByRecurringTransactionId(
    recurringTransactionId: string,
    userId: string
  ): Promise<TransactionWithCategory[]> {
    return db
      .select(BASE_SELECT)
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.recurringTransactionId, recurringTransactionId)
        )
      )
      .orderBy(desc(transactions.date));
  },

  async findByPeriodIdOrDate(
    userId: string,
    periodId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<TransactionWithCategory[]> {
    if (periodId) return transactionRepository.findByPeriodId(userId, periodId);
    if (dateRange) return transactionRepository.findByUserId(userId, dateRange);
    return transactionRepository.findAllByUserId(userId);
  },
} satisfies ITransactionRepository;

export type { ITransactionRepository };
