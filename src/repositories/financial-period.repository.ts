import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { financialPeriods } from "../db/schema";

export class FinancialPeriodRepository {
  static async create(data: any): Promise<any> {
    const [period] = await db.insert(financialPeriods).values(data).returning();
    return period;
  }

  static async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return await db
      .select()
      .from(financialPeriods)
      .where(
        and(
          eq(financialPeriods.userId, userId),
          gte(financialPeriods.startDate, startDate),
          lte(financialPeriods.endDate, endDate)
        )
      );
  }

  static async findActiveByUser(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(financialPeriods)
      .where(
        and(
          eq(financialPeriods.userId, userId),
          eq(financialPeriods.isActive, true)
        )
      )
      .orderBy(financialPeriods.startDate);
  }

  static async deactivatePeriods(userId: string): Promise<void> {
    await db
      .update(financialPeriods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(financialPeriods.userId, userId));
  }

  static async findOrCreatePeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Verificar se já existe
    const existing = await db
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

    if (existing.length > 0) {
      return existing[0];
    }

    // Criar novo período
    return await this.create({
      userId,
      startDate,
      endDate,
      isActive: true,
    });
  }
}
