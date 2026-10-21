import type { NewTransfer, Transfer } from '@infra/db/schema';

export interface ITransferRepository {
  create(data: Omit<NewTransfer, 'id' | 'createdAt'>): Promise<Transfer>;
  findByIdAndUserId(id: string, userId: string): Promise<Transfer | null>;
  findInRange(userId: string, start: Date, end: Date): Promise<Transfer[]>;
  findSince(userId: string, since: Date, before?: Date): Promise<Transfer[]>;
  findExternalIds(userId: string, externalIds: string[]): Promise<string[]>;
  delete(id: string, userId: string): Promise<boolean>;
}
