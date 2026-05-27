import type { NewOvertimeRecord, OvertimeRecord } from '../../db/schema';
import type { PaginationQuery, PaginationResult } from '../../helpers/pagination';

export interface OvertimeWithCompany extends OvertimeRecord {
  company: { id: string; name: string };
}

export interface OvertimeSummaryByCompany {
  companyId: string;
  companyName: string;
  hours: number;
  amount: number;
}

export interface OvertimeSummary {
  month: number;
  year: number;
  totalHours: number;
  totalAmount: number;
  byCompany: OvertimeSummaryByCompany[];
}

export interface IOvertimeRepository {
  create(data: Omit<NewOvertimeRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<OvertimeRecord>;
  findByIdAndUserId(id: string, userId: string): Promise<OvertimeWithCompany | null>;
  findByUserId(
    userId: string,
    filters?: { month?: number; year?: number; companyId?: string }
  ): Promise<OvertimeWithCompany[]>;
  findByUserIdPaginated(
    userId: string,
    filters: { month?: number; year?: number; companyId?: string },
    pagination: PaginationQuery
  ): Promise<PaginationResult<OvertimeWithCompany>>;
  update(
    id: string,
    userId: string,
    data: Partial<Omit<NewOvertimeRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<OvertimeRecord | null>;
  delete(id: string, userId: string): Promise<OvertimeRecord | null>;
  getSummary(userId: string, month: number, year: number): Promise<OvertimeSummary>;
  setTransactionId(id: string, transactionId: string): Promise<void>;
}
