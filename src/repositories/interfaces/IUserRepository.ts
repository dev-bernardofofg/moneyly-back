import type { NewUser, User } from '../../db/schema';

export interface IUserRepository {
  create(userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  findAll(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByIdWithoutPassword(id: string): Promise<Omit<User, 'password'> | null>;
  updateGoogleInfo(
    id: string,
    googleInfo: { googleId: string; avatar?: string }
  ): Promise<User | null>;
  updateMonthlyIncome(id: string, monthlyIncome: number): Promise<User | null>;
  updateFinancialPeriod(
    id: string,
    financialDayStart: number,
    financialDayEnd: number
  ): Promise<User | null>;
  updateIncomeAndPeriod(
    id: string,
    monthlyIncome: number,
    financialDayStart: number,
    financialDayEnd: number
  ): Promise<User | null>;
  updateFirstAccess(id: string, firstAccess: boolean): Promise<User | null>;
}
