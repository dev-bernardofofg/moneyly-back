import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@infra/db';
import { accounts, type Account, type NewAccount } from '@infra/db/schema';
import type { AccountUpdate, IAccountRepository } from './IAccountRepository';

const DEFAULT_ACCOUNT_NAME = 'Conta principal';

export const accountRepository = {
  async create(data: Omit<NewAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const [account] = await db.insert(accounts).values(data).returning();
    if (!account) throw new Error('Falha ao criar conta');
    return account;
  },

  async findActiveByUserId(userId: string): Promise<Account[]> {
    return db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .orderBy(desc(accounts.isDefault), asc(accounts.name));
  },

  async findActiveCards(): Promise<Account[]> {
    return db
      .select()
      .from(accounts)
      .where(and(eq(accounts.type, 'credit_card'), eq(accounts.isActive, true)));
  },

  async findAllByUserId(userId: string): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.userId, userId));
  },

  async findByIdAndUserId(id: string, userId: string): Promise<Account | null> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return account ?? null;
  },

  async findActiveByName(userId: string, name: string): Promise<Account | null> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.isActive, true),
          sql`lower(${accounts.name}) = lower(${name})`
        )
      );
    return account ?? null;
  },

  async findDefault(userId: string): Promise<Account | null> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isDefault, true)));
    return account ?? null;
  },

  // Índice único parcial (user_id) WHERE is_default: requisições concorrentes criam uma só.
  async ensureDefault(userId: string): Promise<Account> {
    const existing = await accountRepository.findDefault(userId);
    if (existing) return existing;

    await db
      .insert(accounts)
      .values({ userId, name: DEFAULT_ACCOUNT_NAME, type: 'checking', isDefault: true })
      .onConflictDoNothing();

    const created = await accountRepository.findDefault(userId);
    if (!created) throw new Error('Falha ao criar conta padrão');
    return created;
  },

  async update(id: string, userId: string, data: AccountUpdate): Promise<Account | null> {
    const [account] = await db
      .update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return account ?? null;
  },
} satisfies IAccountRepository;

export type { IAccountRepository };
