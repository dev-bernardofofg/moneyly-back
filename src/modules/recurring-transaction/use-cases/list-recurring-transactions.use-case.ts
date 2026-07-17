import { PaginationHelper } from '../../../core/helpers/pagination';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';

export const listRecurringTransactionsUseCase = async (
  userId: string,
  pagination: { page?: number; limit?: number },
  includeInactive = false
) => {
  const paginationQuery = PaginationHelper.validateAndParse(pagination);
  return recurringTransactionRepository.findByUserIdPaginated(
    userId,
    paginationQuery,
    includeInactive
  );
};
