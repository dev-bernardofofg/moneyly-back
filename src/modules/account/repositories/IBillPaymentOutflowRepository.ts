import type { NewBillPaymentOutflow } from '@infra/db/schema';

export interface IBillPaymentOutflowRepository {
  createMany(rows: NewBillPaymentOutflow[]): Promise<void>;
  findExternalIds(userId: string, externalIds: string[]): Promise<string[]>;
  sumAfter(userId: string, accountId: string, cutoff: Date): Promise<number>;
}
