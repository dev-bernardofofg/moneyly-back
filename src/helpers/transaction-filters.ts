import { spEndOfDay, spMidnight } from './dates';

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
  // Contrato: filtros de dia SP → [meia-noite SP, fim do dia SP] inclusivo.
  if (query.startDate) filters.startDate = spMidnight(query.startDate);
  if (query.endDate) filters.endDate = spEndOfDay(query.endDate);
  return filters;
};
