import type { Account, NewAccount } from '@infra/db/schema';

export type AccountUpdate = Partial<
  Pick<NewAccount, 'name' | 'closingDay' | 'dueDay' | 'isActive'>
>;

export interface IAccountRepository {
  create(data: Omit<NewAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account>;
  findActiveByUserId(userId: string): Promise<Account[]>;
  findByIdAndUserId(id: string, userId: string): Promise<Account | null>;
  findActiveByName(userId: string, name: string): Promise<Account | null>;
  findDefault(userId: string): Promise<Account | null>;
  ensureDefault(userId: string): Promise<Account>;
  update(id: string, userId: string, data: AccountUpdate): Promise<Account | null>;
}
