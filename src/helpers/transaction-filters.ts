export interface TransactionFiltersQuery {
  category?: string;
  startDate?: string;
  endDate?: string;
  periodId?: string;
  type?: 'income' | 'expense';
}

export interface BuiltTransactionFilters {
  category?: string;
  startDate?: Date;
  endDate?: Date;
  periodId?: string;
  type?: 'income' | 'expense';
}

export const buildTransactionFilters = (
  query: TransactionFiltersQuery
): BuiltTransactionFilters => {
  const filters: BuiltTransactionFilters = {};
  if (query.category) filters.category = query.category;
  if (query.periodId) filters.periodId = query.periodId;
  if (query.type) filters.type = query.type;
  if (query.startDate) filters.startDate = new Date(query.startDate);
  if (query.endDate) filters.endDate = new Date(query.endDate);
  return filters;
};
