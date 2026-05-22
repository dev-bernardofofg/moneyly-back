import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, type NewUser, type User } from '../db/schema';
import type { IUserRepository } from './interfaces/IUserRepository';

export const userRepository = {
  async create(userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    if (!user) throw new Error('Falha ao criar usuário');
    return user;
  },

  async findAll(): Promise<User[]> {
    return db.select().from(users);
  },

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  },

  async findByIdWithoutPassword(id: string): Promise<Omit<User, 'password'> | null> {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        googleId: users.googleId,
        avatar: users.avatar,
        monthlyIncome: users.monthlyIncome,
        financialDayStart: users.financialDayStart,
        financialDayEnd: users.financialDayEnd,
        firstAccess: users.firstAccess,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id));
    return user ?? null;
  },

  async updateGoogleInfo(
    id: string,
    googleInfo: { googleId: string; avatar?: string }
  ): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ googleId: googleInfo.googleId, avatar: googleInfo.avatar, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  },

  async updateMonthlyIncome(id: string, monthlyIncome: number): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ monthlyIncome: monthlyIncome.toString(), firstAccess: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  },

  async updateFinancialPeriod(
    id: string,
    financialDayStart: number,
    financialDayEnd: number
  ): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ financialDayStart, financialDayEnd, firstAccess: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  },

  async updateIncomeAndPeriod(
    id: string,
    monthlyIncome: number,
    financialDayStart: number,
    financialDayEnd: number
  ): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        monthlyIncome: monthlyIncome.toString(),
        financialDayStart,
        financialDayEnd,
        firstAccess: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  },

  async updateFirstAccess(id: string, firstAccess: boolean): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ firstAccess, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  },
} satisfies IUserRepository;

export type { IUserRepository };
