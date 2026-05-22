import type { FinancialPeriod } from '../../db/schema';

export interface IFinancialPeriodRepository {
  create(data: {
    userId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  }): Promise<FinancialPeriod>;
  findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialPeriod[]>;
  findActiveByUser(userId: string): Promise<FinancialPeriod[]>;
  deactivatePeriods(userId: string): Promise<void>;
  findOrCreatePeriod(userId: string, startDate: Date, endDate: Date): Promise<FinancialPeriod>;
  findAllByUserWithTransactionCount(
    userId: string
  ): Promise<(FinancialPeriod & { transactionCount: number })[]>;
  findById(periodId: string, userId: string): Promise<FinancialPeriod | undefined>;
}
