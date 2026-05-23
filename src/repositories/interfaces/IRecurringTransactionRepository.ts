import type { NewRecurringTransaction, RecurringTransaction } from '../../db/schema';
import type { PaginationQuery, PaginationResult } from '../../helpers/pagination';

export interface IRecurringTransactionRepository {
  create(
    data: Omit<NewRecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RecurringTransaction>;
  findByUserId(userId: string, includeInactive?: boolean): Promise<RecurringTransaction[]>;
  findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery,
    includeInactive?: boolean
  ): Promise<PaginationResult<RecurringTransaction>>;
  findById(id: string, userId: string): Promise<RecurringTransaction | null>;
  findDueTransactions(now?: Date): Promise<RecurringTransaction[]>;
  update(
    id: string,
    userId: string,
    data: Partial<Omit<NewRecurringTransaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<RecurringTransaction | null>;
  updateNextExecution(id: string, nextExecution: Date): Promise<boolean>;
  incrementExecutedInstallments(id: string): Promise<RecurringTransaction | null>;
  deactivateById(id: string): Promise<boolean>;
  reactivate(id: string, userId: string, nextExecution: Date): Promise<RecurringTransaction | null>;
  deactivate(id: string, userId: string): Promise<boolean>;
  delete(id: string, userId: string): Promise<boolean>;
  findAllActive(): Promise<RecurringTransaction[]>;
}
