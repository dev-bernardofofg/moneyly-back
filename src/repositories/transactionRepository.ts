import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db";
import {
  transactions,
  type NewTransaction,
  type Transaction,
} from "../db/schema";

export class TransactionRepository {
  // Criar transação
  static async create(
    transactionData: Omit<NewTransaction, "id" | "createdAt" | "updatedAt">
  ): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  // Buscar transações do usuário com filtros
  static async findByUserId(
    userId: string,
    filters?: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Transaction[]> {
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
      .select()
      .from(transactions)
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

  // Buscar todas as transações do usuário
  static async findAllByUserId(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }
}
