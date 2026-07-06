export type { TransactionQueryFilters as TransactionFilters } from '../repositories/interfaces/ITransactionRepository';

export interface ITransaction {
  type: 'income' | 'expense';
  title: string;
  amount: string;
  category: string;
  description: string;
  date: Date;
  recurringTransactionId?: string;
}

export type UpdateTransactionData = Partial<{
  type: 'income' | 'expense';
  title: string;
  amount: string;
  categoryId: string;
  description: string;
  date: Date;
  periodId: string;
}>;

export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  averageIncome: number;
  averageExpense: number;
}

export interface CategoryChartData {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  color?: string;
}
