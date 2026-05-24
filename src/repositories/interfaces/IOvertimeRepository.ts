import type { NewOvertimeRecord, OvertimeRecord } from '../../db/schema';

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
  periodId: string;
  totalHours: number;
  totalAmount: number;
  byCompany: OvertimeSummaryByCompany[];
}

export interface IOvertimeRepository {
  create(data: Omit<NewOvertimeRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<OvertimeRecord>;
  findByIdAndUserId(id: string, userId: string): Promise<OvertimeWithCompany | null>;
  findByUserId(
    userId: string,
    filters?: { periodId?: string; companyId?: string }
  ): Promise<OvertimeWithCompany[]>;
  update(
    id: string,
    userId: string,
    data: Partial<Omit<NewOvertimeRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<OvertimeRecord | null>;
  delete(id: string, userId: string): Promise<OvertimeRecord | null>;
  getSummary(userId: string, periodId: string): Promise<OvertimeSummary>;
  setTransactionId(id: string, transactionId: string): Promise<void>;
}
