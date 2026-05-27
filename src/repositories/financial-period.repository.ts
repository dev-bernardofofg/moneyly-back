import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { financialPeriods, transactions, type FinancialPeriod } from '../db/schema';
import type { IFinancialPeriodRepository } from './interfaces/IFinancialPeriodRepository';

async function createPeriod(data: {
  userId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}): Promise<FinancialPeriod> {
  const [period] = await db.insert(financialPeriods).values(data).returning();
  if (!period) throw new Error('Falha ao criar período financeiro');
  return period;
}

export const financialPeriodRepository = {
  create: createPeriod,

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialPeriod[]> {
    return db
      .select()
      .from(financialPeriods)
      .where(
        and(
          eq(financialPeriods.userId, userId),
          gte(financialPeriods.startDate, startDate),
          lte(financialPeriods.endDate, endDate)
        )
      );
  },

  async findActiveByUser(userId: string): Promise<FinancialPeriod[]> {
    return db
      .select()
      .from(financialPeriods)
      .where(and(eq(financialPeriods.userId, userId), eq(financialPeriods.isActive, true)))
      .orderBy(financialPeriods.startDate);
  },

  async deactivatePeriods(userId: string): Promise<void> {
    await db
      .update(financialPeriods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(financialPeriods.userId, userId));
  },

  async findOrCreatePeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialPeriod> {
    const [inserted] = await db
      .insert(financialPeriods)
      .values({ userId, startDate, endDate, isActive: true })
      .onConflictDoNothing({
        target: [financialPeriods.userId, financialPeriods.startDate, financialPeriods.endDate],
      })
      .returning();
    if (inserted) return inserted;

    const [existing] = await db
      .select()
      .from(financialPeriods)
      .where(
        and(
          eq(financialPeriods.userId, userId),
          eq(financialPeriods.startDate, startDate),
          eq(financialPeriods.endDate, endDate)
        )
      )
      .limit(1);
    if (!existing) throw new Error('Falha ao localizar período após upsert');
    return existing;
  },

  async findAllByUserWithTransactionCount(
    userId: string
  ): Promise<(FinancialPeriod & { transactionCount: number })[]> {
    const periods = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.userId, userId))
      .orderBy(desc(financialPeriods.startDate));

    if (periods.length === 0) return [];

    const counts = await db
      .select({ periodId: transactions.periodId, total: count() })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(transactions.periodId);

    const countMap = new Map(counts.map((c) => [c.periodId, Number(c.total)]));
    return periods
      .map((p) => ({ ...p, transactionCount: countMap.get(p.id) ?? 0 }))
      .filter((p) => p.isActive || p.transactionCount > 0);
  },

  async findById(periodId: string, userId: string): Promise<FinancialPeriod | undefined> {
    const [period] = await db
      .select()
      .from(financialPeriods)
      .where(and(eq(financialPeriods.id, periodId), eq(financialPeriods.userId, userId)))
      .limit(1);
    return period;
  },
} satisfies IFinancialPeriodRepository;

export type { IFinancialPeriodRepository };
