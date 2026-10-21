import type { CardBillPayment } from '@infra/db/schema';

export type CardBillPaymentKey = { userId: string; accountId: string; dueDate: Date };

export interface ICardBillPaymentRepository {
  findByAccountIds(userId: string, accountIds: string[]): Promise<CardBillPayment[]>;
  markManual(key: CardBillPaymentKey): Promise<CardBillPayment>;
  markImported(key: CardBillPaymentKey): Promise<boolean>;
  remove(key: CardBillPaymentKey): Promise<boolean>;
}
