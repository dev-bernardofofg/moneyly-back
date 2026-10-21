import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@infra/db';
import { cardBillPayments, type CardBillPayment } from '@infra/db/schema';
import type { CardBillPaymentKey, ICardBillPaymentRepository } from './ICardBillPaymentRepository';

const byKey = ({ userId, accountId, dueDate }: CardBillPaymentKey) =>
  and(
    eq(cardBillPayments.userId, userId),
    eq(cardBillPayments.accountId, accountId),
    eq(cardBillPayments.dueDate, dueDate)
  );

export const cardBillPaymentRepository = {
  async findByAccountIds(userId: string, accountIds: string[]): Promise<CardBillPayment[]> {
    if (accountIds.length === 0) return [];
    return db
      .select()
      .from(cardBillPayments)
      .where(
        and(eq(cardBillPayments.userId, userId), inArray(cardBillPayments.accountId, accountIds))
      );
  },

  // Marcar à mão vence a detecção: vira manual mesmo se a importação já tinha marcado.
  async markManual(key: CardBillPaymentKey): Promise<CardBillPayment> {
    const [row] = await db
      .insert(cardBillPayments)
      .values({ ...key, source: 'manual' })
      .onConflictDoUpdate({
        target: [cardBillPayments.accountId, cardBillPayments.dueDate],
        set: { source: 'manual', paidAt: new Date() },
      })
      .returning();
    return row!;
  },

  async markImported(key: CardBillPaymentKey): Promise<boolean> {
    const rows = await db
      .insert(cardBillPayments)
      .values({ ...key, source: 'import' })
      .onConflictDoNothing()
      .returning();
    return rows.length > 0;
  },

  async remove(key: CardBillPaymentKey): Promise<boolean> {
    const rows = await db.delete(cardBillPayments).where(byKey(key)).returning();
    return rows.length > 0;
  },
} satisfies ICardBillPaymentRepository;
