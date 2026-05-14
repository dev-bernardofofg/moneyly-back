import type { NewTransaction, Transaction } from "../../db/schema";
import type { PaginationQuery, PaginationResult } from "../../helpers/pagination";
import type { TransactionWithCategory } from "../transaction.repository";

export interface ITransactionRepository {
  create(data: Omit<NewTransaction, "id" | "createdAt" | "updatedAt">): Promise<Transaction>;
  findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery,
    filters?: { category?: string; startDate?: Date; endDate?: Date }
  ): Promise<PaginationResult<TransactionWithCategory>>;
  findByUserId(
    userId: string,
    filters?: { category?: string; startDate?: Date; endDate?: Date }
  ): Promise<TransactionWithCategory[]>;
  findByIdAndUserId(id: string, userId: string): Promise<Transaction | null>;
  update(
    id: string,
    userId: string,
    updateData: Partial<Omit<NewTransaction, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<Transaction | null>;
  delete(id: string, userId: string): Promise<Transaction | null>;
  findAllByUserId(userId: string): Promise<TransactionWithCategory[]>;
  findByPeriodId(userId: string, periodId: string): Promise<TransactionWithCategory[]>;
  findByPeriodIdOrDate(
    userId: string,
    periodId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<TransactionWithCategory[]>;
  findByRecurringTransactionId(recurringTransactionId: string, userId: string): Promise<TransactionWithCategory[]>;
}
