import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { financialPeriods } from "../db/schema";

// Implementa IFinancialPeriodRepository (métodos estáticos)
export class FinancialPeriodRepository {
  static async create(data: {
    userId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  }): Promise<{
    id: string;
    userId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const [period] = await db.insert(financialPeriods).values(data).returning();
    if (!period) throw new Error("Falha ao criar período financeiro");
    return period;
  }

  static async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      id: string;
      userId: string;
      startDate: Date;
      endDate: Date;
      isActive: boolean | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
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

  static async findActiveByUser(userId: string): Promise<
    Array<{
      id: string;
      userId: string;
      startDate: Date;
      endDate: Date;
      isActive: boolean | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
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
  ): Promise<{
    id: string;
    userId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
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

    const existingPeriod = existing[0];
    if (existingPeriod) {
      return existingPeriod;
    }

    // Criar novo período
    const newPeriod = await this.create({
      userId,
      startDate,
      endDate,
      isActive: true,
    });
    return newPeriod;
  }

  static async findById(
    periodId: string,
    userId: string
  ): Promise<
    | {
        id: string;
        userId: string;
        startDate: Date;
        endDate: Date;
        isActive: boolean | null;
        createdAt: Date;
        updatedAt: Date;
      }
    | undefined
  > {
    const [period] = await db
      .select()
      .from(financialPeriods)
      .where(
        and(
          eq(financialPeriods.id, periodId),
          eq(financialPeriods.userId, userId)
        )
      )
      .limit(1);

    return period;
  }
}
