import type { Company, NewCompany } from '../../db/schema';

export interface ICompanyRepository {
  create(data: Omit<NewCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company>;
  findByUserId(userId: string): Promise<Company[]>;
  findByIdAndUserId(id: string, userId: string): Promise<Company | null>;
  update(
    id: string,
    userId: string,
    data: Partial<Pick<NewCompany, 'name' | 'hourlyRate' | 'isActive'>>
  ): Promise<Company | null>;
  softDelete(id: string, userId: string): Promise<Company | null>;
}
