import { and, desc, eq, gte, inArray, lt, lte, or } from 'drizzle-orm';
import { db } from '@infra/db';
import { transfers, type NewTransfer, type Transfer } from '@infra/db/schema';
import type { ITransferRepository } from './ITransferRepository';

export const transferRepository = {
  async create(data: Omit<NewTransfer, 'id' | 'createdAt'>): Promise<Transfer> {
    const [transfer] = await db.insert(transfers).values(data).returning();
    if (!transfer) throw new Error('Falha ao criar transferência');
    return transfer;
  },

  async findByIdAndUserId(id: string, userId: string): Promise<Transfer | null> {
    const [transfer] = await db
      .select()
      .from(transfers)
      .where(and(eq(transfers.id, id), eq(transfers.userId, userId)));
    return transfer ?? null;
  },

  async findInRange(userId: string, start: Date, end: Date): Promise<Transfer[]> {
    return db
      .select()
      .from(transfers)
      .where(
        and(eq(transfers.userId, userId), gte(transfers.date, start), lte(transfers.date, end))
      )
      .orderBy(desc(transfers.date));
  },

  async findSince(userId: string, since: Date, before?: Date): Promise<Transfer[]> {
    return db
      .select()
      .from(transfers)
      .where(
        and(
          eq(transfers.userId, userId),
          gte(transfers.date, since),
          ...(before ? [lt(transfers.date, before)] : [])
        )
      );
  },

  async findExternalIds(userId: string, externalIds: string[]): Promise<string[]> {
    if (externalIds.length === 0) return [];
    const rows = await db
      .select({ from: transfers.fromExternalId, to: transfers.toExternalId })
      .from(transfers)
      .where(
        and(
          eq(transfers.userId, userId),
          or(
            inArray(transfers.fromExternalId, externalIds),
            inArray(transfers.toExternalId, externalIds)
          )
        )
      );
    return rows.flatMap((row) => [row.from, row.to]).filter((id): id is string => Boolean(id));
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const rows = await db
      .delete(transfers)
      .where(and(eq(transfers.id, id), eq(transfers.userId, userId)))
      .returning();
    return rows.length > 0;
  },
} satisfies ITransferRepository;
