import type { NewTransaction, Transaction } from '@infra/db/schema';
import type { PaginationQuery, PaginationResult } from '@core/helpers/pagination';
import type { TransactionWithCategory } from './transaction.repository';

export interface TransactionQueryFilters {
  category?: string;
  startDate?: Date;
  endDate?: Date;
  periodId?: string;
  type?: 'income' | 'expense';
  accountId?: string;
}

export interface ITransactionRepository {
  create(data: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery,
    filters?: TransactionQueryFilters
  ): Promise<PaginationResult<TransactionWithCategory>>;
  findByUserId(
    userId: string,
    filters?: TransactionQueryFilters
  ): Promise<TransactionWithCategory[]>;
  findByIdAndUserId(id: string, userId: string): Promise<Transaction | null>;
  update(
    id: string,
    userId: string,
    updateData: Partial<Omit<NewTransaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Transaction | null>;
  delete(id: string, userId: string): Promise<Transaction | null>;
  findAllByUserId(userId: string): Promise<TransactionWithCategory[]>;
  findByPeriodId(userId: string, periodId: string): Promise<TransactionWithCategory[]>;
  findByPeriodIdOrDate(
    userId: string,
    periodId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<TransactionWithCategory[]>;
  findByRecurringTransactionId(
    recurringTransactionId: string,
    userId: string
  ): Promise<TransactionWithCategory[]>;
  findImportedExternalIds(userId: string, externalIds: string[]): Promise<string[]>;
  findReconcileCandidates(
    userId: string,
    accountId: string,
    scope: { periodId: string } | { start: Date; end: Date }
  ): Promise<ReconcileCandidateRow[]>;
  linkImported(
    id: string,
    userId: string,
    data: { externalId: string; amount: number }
  ): Promise<boolean>;
  findRecentTitleCategories(userId: string, limit: number): Promise<TitleCategory[]>;
  sumExpensesByAccountAndCategory(
    userId: string,
    periodId: string,
    accountIds: string[]
  ): Promise<AccountCategoryTotal[]>;
  findTransferCandidates(
    userId: string,
    excludeAccountId: string,
    start: Date,
    end: Date
  ): Promise<TransferCandidate[]>;
  findTransferCandidateById(
    id: string,
    userId: string
  ): Promise<(TransferCandidate & { accountType: string }) | null>;
  sumByPeriodAndCategory(userId: string, periodIds: string[]): Promise<PeriodCategoryTotal[]>;
  sumSignedSince(userId: string, accountId: string, since: Date): Promise<number>;
  sumCardExpensesByPeriod(
    userId: string,
    accountIds: string[],
    periodsEndingFrom: Date
  ): Promise<CardPeriodTotal[]>;
  findFlowsBeforePeriod(userId: string, periodStart: Date, since: Date): Promise<AccountFlow[]>;
  findDatesByAccountId(
    userId: string,
    accountId: string
  ): Promise<Pick<Transaction, 'id' | 'date'>[]>;
  setPeriodId(userId: string, ids: string[], periodId: string): Promise<void>;
  createManyImported(
    rows: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Transaction[]>;
}

export type ReconcileCandidateRow = Pick<
  Transaction,
  'id' | 'type' | 'amount' | 'date' | 'externalId' | 'recurringTransactionId'
>;
export type TitleCategory = Pick<Transaction, 'title' | 'categoryId'>;
export type TransferCandidate = Pick<
  Transaction,
  'id' | 'accountId' | 'type' | 'amount' | 'date' | 'externalId'
>;
export type PeriodCategoryTotal = {
  periodId: string;
  type: 'income' | 'expense';
  categoryId: string;
  categoryName: string;
  total: number;
};
export type CardPeriodTotal = { accountId: string; startDate: Date; endDate: Date; total: number };
export type AccountFlow = Pick<Transaction, 'accountId' | 'type' | 'amount' | 'date'>;
export type AccountCategoryTotal = {
  accountId: string;
  categoryId: string;
  categoryName: string;
  total: number;
};
