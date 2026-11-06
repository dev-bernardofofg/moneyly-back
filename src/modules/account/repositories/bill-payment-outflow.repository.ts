import { and, eq, gt, inArray, sum } from 'drizzle-orm';
import { db } from '@infra/db';
import { billPaymentOutflows } from '@infra/db/schema';
import type { IBillPaymentOutflowRepository } from './IBillPaymentOutflowRepository';

export const billPaymentOutflowRepository = {
  async createMany(rows) {
    if (rows.length === 0) return;
    await db
      .insert(billPaymentOutflows)
      .values(rows)
      .onConflictDoNothing({
        target: [billPaymentOutflows.userId, billPaymentOutflows.externalId],
      });
  },

  async findExternalIds(userId, externalIds) {
    if (externalIds.length === 0) return [];
    const rows = await db
      .select({ externalId: billPaymentOutflows.externalId })
      .from(billPaymentOutflows)
      .where(
        and(
          eq(billPaymentOutflows.userId, userId),
          inArray(billPaymentOutflows.externalId, externalIds)
        )
      );
    return rows.map((row) => row.externalId);
  },

  async sumAfter(userId, accountId, cutoff) {
    const [row] = await db
      .select({ total: sum(billPaymentOutflows.amount) })
      .from(billPaymentOutflows)
      .where(
        and(
          eq(billPaymentOutflows.userId, userId),
          eq(billPaymentOutflows.accountId, accountId),
          gt(billPaymentOutflows.date, cutoff)
        )
      );
    return Number(row?.total ?? 0);
  },
} satisfies IBillPaymentOutflowRepository;
