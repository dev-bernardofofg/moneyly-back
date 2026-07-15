/**
 * Interfaces para Repositories
 * Seguindo princípios SOLID (Interface Segregation + Dependency Inversion)
 */

import type { NewTransaction, NewUser, Transaction, User } from '../../infra/db/schema';
import type { PaginationQuery, PaginationResult } from '../../core/helpers/pagination';
import type { TransactionWithCategory } from '../transaction.repository';

// ============================================================
// USER REPOSITORY INTERFACE
// ============================================================
export interface IUserRepository {
  create(userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  findAll(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByIdWithoutPassword(id: string): Promise<Omit<User, 'password'> | null>;
  updateGoogleInfo(
    id: string,
    googleInfo: { googleId: string; avatar?: string }
  ): Promise<User | null>;
  updateMonthlyIncome(id: string, monthlyIncome: number): Promise<User | null>;
  updateFinancialPeriod(
    id: string,
    financialDayStart: number,
    financialDayEnd: number
  ): Promise<User | null>;
  updateIncomeAndPeriod(
    id: string,
    monthlyIncome: number,
    financialDayStart: number,
    financialDayEnd: number
  ): Promise<User | null>;
  updateFirstAccess(id: string, firstAccess: boolean): Promise<User | null>;
}

// ============================================================
// TRANSACTION REPOSITORY INTERFACE
// ============================================================
export interface ITransactionRepository {
  create(
    transactionData: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction>;
  findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery,
    filters?: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginationResult<TransactionWithCategory>>;
  findByUserId(
    userId: string,
    filters?: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
    }
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
}
