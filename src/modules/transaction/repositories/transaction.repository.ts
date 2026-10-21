import { and, count, desc, eq, gte, inArray, isNull, lt, lte, ne, or, sql, sum } from 'drizzle-orm';
import { db } from '@infra/db';
import {
  accounts,
  categories,
  financialPeriods,
  transactions,
  type NewTransaction,
  type Transaction,
} from '@infra/db/schema';
import {
  PaginationHelper,
  type PaginationQuery,
  type PaginationResult,
} from '@core/helpers/pagination';
import type {
  AccountCategoryTotal,
  AccountFlow,
  CardPeriodTotal,
  ITransactionRepository,
  TransferCandidate,
  ManualTransactionMatch,
  TitleCategory,
  TransactionQueryFilters,
} from './ITransactionRepository';

export type TransactionWithCategory = Omit<Transaction, 'categoryId' | 'userId' | 'externalId'> & {
  category: { id: string; name: string };
};

const buildConditions = (userId: string, filters?: TransactionQueryFilters) => {
  const conditions = [eq(transactions.userId, userId)];
  if (filters?.category) conditions.push(eq(transactions.categoryId, filters.category));
  if (filters?.periodId) conditions.push(eq(transactions.periodId, filters.periodId));
  if (filters?.type) conditions.push(eq(transactions.type, filters.type));
  if (filters?.accountId) conditions.push(eq(transactions.accountId, filters.accountId));
  if (filters?.startDate) conditions.push(gte(transactions.date, filters.startDate));
  if (filters?.endDate) conditions.push(lte(transactions.date, filters.endDate));
  return conditions;
};

const BASE_SELECT = {
  id: transactions.id,
  periodId: transactions.periodId,
  recurringTransactionId: transactions.recurringTransactionId,
  overtimeRecordId: transactions.overtimeRecordId,
  accountId: transactions.accountId,
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
    filters?: TransactionQueryFilters
  ): Promise<PaginationResult<TransactionWithCategory>> {
    const conditions = buildConditions(userId, filters);

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
    filters?: TransactionQueryFilters
  ): Promise<TransactionWithCategory[]> {
    const conditions = buildConditions(userId, filters);

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

  async findImportedExternalIds(userId: string, externalIds: string[]): Promise<string[]> {
    if (externalIds.length === 0) return [];
    const rows = await db
      .select({ externalId: transactions.externalId })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), inArray(transactions.externalId, externalIds)));
    return rows.map((row) => row.externalId!);
  },

  async findManualInRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ManualTransactionMatch[]> {
    return db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.externalId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );
  },

  async findRecentTitleCategories(userId: string, limit: number): Promise<TitleCategory[]> {
    return db
      .select({ title: transactions.title, categoryId: transactions.categoryId })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(limit);
  },

  async sumExpensesByAccountAndCategory(
    userId: string,
    periodId: string,
    accountIds: string[]
  ): Promise<AccountCategoryTotal[]> {
    if (accountIds.length === 0) return [];
    const rows = await db
      .select({
        accountId: transactions.accountId,
        categoryId: categories.id,
        categoryName: categories.name,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.periodId, periodId),
          eq(transactions.type, 'expense'),
          inArray(transactions.accountId, accountIds)
        )
      )
      .groupBy(transactions.accountId, categories.id, categories.name);
    return rows.map((row) => ({ ...row, total: Number(row.total ?? 0) }));
  },

  async findTransferCandidates(
    userId: string,
    excludeAccountId: string,
    start: Date,
    end: Date
  ): Promise<TransferCandidate[]> {
    return db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
        externalId: transactions.externalId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(accounts.type, 'checking'),
          ne(transactions.accountId, excludeAccountId),
          isNull(transactions.recurringTransactionId),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      );
  },

  async findTransferCandidateById(
    id: string,
    userId: string
  ): Promise<(TransferCandidate & { accountType: string }) | null> {
    const [row] = await db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
        externalId: transactions.externalId,
        accountType: accounts.type,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return row ?? null;
  },

  async sumSignedSince(userId: string, accountId: string, since: Date): Promise<number> {
    const [row] = await db
      .select({
        total: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else -${transactions.amount} end), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, accountId),
          gte(transactions.date, since)
        )
      );
    return Number(row?.total ?? 0);
  },

  async sumCardExpensesByPeriod(
    userId: string,
    accountIds: string[],
    periodsEndingFrom: Date
  ): Promise<CardPeriodTotal[]> {
    if (accountIds.length === 0) return [];
    const rows = await db
      .select({
        accountId: transactions.accountId,
        startDate: financialPeriods.startDate,
        endDate: financialPeriods.endDate,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .innerJoin(financialPeriods, eq(transactions.periodId, financialPeriods.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'expense'),
          inArray(transactions.accountId, accountIds),
          gte(financialPeriods.endDate, periodsEndingFrom)
        )
      )
      .groupBy(transactions.accountId, financialPeriods.startDate, financialPeriods.endDate);
    return rows.map((row) => ({ ...row, total: Number(row.total ?? 0) }));
  },

  async findFlowsBeforePeriod(
    userId: string,
    periodStart: Date,
    since: Date
  ): Promise<AccountFlow[]> {
    return db
      .select({
        accountId: transactions.accountId,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .leftJoin(financialPeriods, eq(transactions.periodId, financialPeriods.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, since),
          // Pelo período, não pela data: compra no cartão pertence ao período da fatura.
          or(
            lt(financialPeriods.startDate, periodStart),
            and(isNull(transactions.periodId), lt(transactions.date, periodStart))
          )
        )
      );
  },

  async findDatesByAccountId(
    userId: string,
    accountId: string
  ): Promise<Pick<Transaction, 'id' | 'date'>[]> {
    return db
      .select({ id: transactions.id, date: transactions.date })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.accountId, accountId)));
  },

  async setPeriodId(userId: string, ids: string[], periodId: string): Promise<void> {
    if (ids.length === 0) return;
    await db
      .update(transactions)
      .set({ periodId, updatedAt: new Date() })
      .where(and(eq(transactions.userId, userId), inArray(transactions.id, ids)));
  },

  async createManyImported(
    rows: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Transaction[]> {
    if (rows.length === 0) return [];
    return db
      .insert(transactions)
      .values(rows)
      .onConflictDoNothing({ target: [transactions.userId, transactions.externalId] })
      .returning();
  },
} satisfies ITransactionRepository;

export type { ITransactionRepository };
