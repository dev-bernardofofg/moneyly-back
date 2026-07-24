import type { PaginationQuery } from '@core/helpers/pagination';
import { transactionRepository } from '../repositories/transaction.repository';

export const listTransactionsPaginatedUseCase = async (
  userId: string,
  pagination: PaginationQuery,
  filters: { category?: string; startDate?: Date; endDate?: Date }
) => {
  return transactionRepository.findByUserIdPaginated(userId, pagination, filters);
};
