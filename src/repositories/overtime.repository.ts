import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  companies,
  overtimeRecords,
  type NewOvertimeRecord,
  type OvertimeRecord,
} from '../db/schema';
import type {
  IOvertimeRepository,
  OvertimeSummary,
  OvertimeWithCompany,
} from './interfaces/IOvertimeRepository';

const BASE_SELECT = {
  id: overtimeRecords.id,
  userId: overtimeRecords.userId,
  companyId: overtimeRecords.companyId,
  description: overtimeRecords.description,
  startTime: overtimeRecords.startTime,
  endTime: overtimeRecords.endTime,
  hoursWorked: overtimeRecords.hoursWorked,
  hourlyRateSnapshot: overtimeRecords.hourlyRateSnapshot,
  amount: overtimeRecords.amount,
  periodId: overtimeRecords.periodId,
  transactionId: overtimeRecords.transactionId,
  createdAt: overtimeRecords.createdAt,
  updatedAt: overtimeRecords.updatedAt,
  company: { id: companies.id, name: companies.name },
} as const;

export const overtimeRepository = {
  async create(
    data: Omit<NewOvertimeRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OvertimeRecord> {
    const [record] = await db.insert(overtimeRecords).values(data).returning();
    if (!record) throw new Error('Falha ao criar registro de hora extra');
    return record;
  },

  async findByIdAndUserId(id: string, userId: string): Promise<OvertimeWithCompany | null> {
    const [record] = await db
      .select(BASE_SELECT)
      .from(overtimeRecords)
      .innerJoin(companies, eq(overtimeRecords.companyId, companies.id))
      .where(and(eq(overtimeRecords.id, id), eq(overtimeRecords.userId, userId)));
    return record ?? null;
  },

  async findByUserId(
    userId: string,
    filters?: { periodId?: string; companyId?: string }
  ): Promise<OvertimeWithCompany[]> {
    const conditions = [eq(overtimeRecords.userId, userId)];
    if (filters?.periodId) conditions.push(eq(overtimeRecords.periodId, filters.periodId));
    if (filters?.companyId) conditions.push(eq(overtimeRecords.companyId, filters.companyId));

    return db
      .select(BASE_SELECT)
      .from(overtimeRecords)
      .innerJoin(companies, eq(overtimeRecords.companyId, companies.id))
      .where(and(...conditions));
  },

  async update(
    id: string,
    userId: string,
    data: Partial<Omit<NewOvertimeRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<OvertimeRecord | null> {
    const [record] = await db
      .update(overtimeRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(overtimeRecords.id, id), eq(overtimeRecords.userId, userId)))
      .returning();
    return record ?? null;
  },

  async delete(id: string, userId: string): Promise<OvertimeRecord | null> {
    const [record] = await db
      .delete(overtimeRecords)
      .where(and(eq(overtimeRecords.id, id), eq(overtimeRecords.userId, userId)))
      .returning();
    return record ?? null;
  },

  async getSummary(userId: string, periodId: string): Promise<OvertimeSummary> {
    const rows = await db
      .select({
        companyId: companies.id,
        companyName: companies.name,
        hours: sql<string>`sum(${overtimeRecords.hoursWorked})`,
        amount: sql<string>`sum(${overtimeRecords.amount})`,
      })
      .from(overtimeRecords)
      .innerJoin(companies, eq(overtimeRecords.companyId, companies.id))
      .where(and(eq(overtimeRecords.userId, userId), eq(overtimeRecords.periodId, periodId)))
      .groupBy(companies.id, companies.name);

    const byCompany = rows.map((r) => ({
      companyId: r.companyId,
      companyName: r.companyName,
      hours: Number(r.hours ?? 0),
      amount: Number(r.amount ?? 0),
    }));

    const totalHours = byCompany.reduce((acc, r) => acc + r.hours, 0);
    const totalAmount = byCompany.reduce((acc, r) => acc + r.amount, 0);

    return { periodId, totalHours, totalAmount, byCompany };
  },

  async setTransactionId(id: string, transactionId: string): Promise<void> {
    await db
      .update(overtimeRecords)
      .set({ transactionId, updatedAt: new Date() })
      .where(eq(overtimeRecords.id, id));
  },
} satisfies IOvertimeRepository;

export type { IOvertimeRepository };
