import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { companies, type Company, type NewCompany } from '../db/schema';
import type { ICompanyRepository } from './interfaces/ICompanyRepository';

export const companyRepository = {
  async create(data: Omit<NewCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    const [company] = await db.insert(companies).values(data).returning();
    if (!company) throw new Error('Falha ao criar empresa');
    return company;
  },

  async findByUserId(userId: string): Promise<Company[]> {
    return db
      .select()
      .from(companies)
      .where(and(eq(companies.userId, userId), eq(companies.isActive, true)));
  },

  async findByIdAndUserId(id: string, userId: string): Promise<Company | null> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.userId, userId)));
    return company ?? null;
  },

  async update(
    id: string,
    userId: string,
    data: Partial<Pick<NewCompany, 'name' | 'hourlyRate' | 'isActive'>>
  ): Promise<Company | null> {
    const [company] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(companies.id, id), eq(companies.userId, userId)))
      .returning();
    return company ?? null;
  },

  async softDelete(id: string, userId: string): Promise<Company | null> {
    const [company] = await db
      .update(companies)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(companies.id, id), eq(companies.userId, userId)))
      .returning();
    return company ?? null;
  },
} satisfies ICompanyRepository;

export type { ICompanyRepository };
