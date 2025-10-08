import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db";
import {
  categories,
  transactions,
  type NewTransaction,
  type Transaction,
} from "../db/schema";
import {
  PaginationHelper,
  PaginationQuery,
  PaginationResult,
} from "../helpers/pagination";

// Tipo para transação com nome da categoria
export type TransactionWithCategory = Omit<
  Transaction,
  "categoryId" | "userId"
> & {
  category: {
    id: string;
    name: string;
  };
};

// Implementa ITransactionRepository (métodos estáticos)
export class TransactionRepository {
  // Criar transação
  static async create(
    transactionData: Omit<NewTransaction, "id" | "createdAt" | "updatedAt">
  ): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning();
    if (!transaction) throw new Error("Falha ao criar transação");
    return transaction;
  }

  // Buscar transações do usuário com filtros e paginação (com nome da categoria)
  static async findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery,
    filters?: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginationResult<TransactionWithCategory>> {
    let conditions = [eq(transactions.userId, userId)];

    if (filters?.category) {
      conditions.push(eq(transactions.categoryId, filters.category));
    }

    if (filters?.startDate) {
      conditions.push(gte(transactions.date, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(transactions.date, filters.endDate));
    }

    // Buscar total de registros
    const totalResult = await db
      .select({ value: count() })
      .from(transactions)
      .where(and(...conditions));
    const total = totalResult[0]?.value ?? 0;

    // Buscar dados paginados com JOIN na categoria
    const data = await db
      .select({
        id: transactions.id,
        periodId: transactions.periodId,
        type: transactions.type,
        title: transactions.title,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date))
      .limit(pagination.limit)
      .offset(pagination.offset);

    const page = Math.floor(pagination.offset / pagination.limit) + 1;

    return PaginationHelper.createPaginationResult(
      data,
      total,
      page,
      pagination.limit
    );
  }

  // Buscar transações do usuário com filtros (com nome da categoria)
  static async findByUserId(
    userId: string,
    filters?: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<TransactionWithCategory[]> {
    let conditions = [eq(transactions.userId, userId)];

    if (filters?.category) {
      conditions.push(eq(transactions.categoryId, filters.category));
    }

    if (filters?.startDate) {
      conditions.push(gte(transactions.date, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(transactions.date, filters.endDate));
    }

    return await db
      .select({
        id: transactions.id,
        periodId: transactions.periodId,
        type: transactions.type,
        title: transactions.title,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date));
  }

  // Buscar transação por ID e usuário
  static async findByIdAndUserId(
    id: string,
    userId: string
  ): Promise<Transaction | null> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

    return transaction || null;
  }

  // Atualizar transação
  static async update(
    id: string,
    userId: string,
    updateData: Partial<
      Omit<NewTransaction, "id" | "userId" | "createdAt" | "updatedAt">
    >
  ): Promise<Transaction | null> {
    const [transaction] = await db
      .update(transactions)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    return transaction || null;
  }

  // Deletar transação
  static async delete(id: string, userId: string): Promise<Transaction | null> {
    const [transaction] = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    return transaction || null;
  }

  // Buscar todas as transações do usuário (com nome da categoria)
  static async findAllByUserId(
    userId: string
  ): Promise<TransactionWithCategory[]> {
    return await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        periodId: transactions.periodId,
        type: transactions.type,
        title: transactions.title,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  // Buscar transações por periodId
  static async findByPeriodId(
    userId: string,
    periodId: string
  ): Promise<TransactionWithCategory[]> {
    return await db
      .select({
        id: transactions.id,
        periodId: transactions.periodId,
        type: transactions.type,
        title: transactions.title,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.periodId, periodId)
        )
      )
      .orderBy(desc(transactions.date));
  }

  // Buscar transações por periodId OU por data (fallback)
  static async findByPeriodIdOrDate(
    userId: string,
    periodId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<TransactionWithCategory[]> {
    if (periodId) {
      // Buscar por periodId (mais preciso)
      return await this.findByPeriodId(userId, periodId);
    } else if (dateRange) {
      // Fallback para busca por data
      return await this.findByUserId(userId, dateRange);
    } else {
      // Buscar todas
      return await this.findAllByUserId(userId);
    }
  }
}
