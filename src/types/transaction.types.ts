export type { TransactionQueryFilters as TransactionFilters } from '../repositories/interfaces/ITransactionRepository';

export interface ITransaction {
  type: 'income' | 'expense';
  title: string;
  amount: string;
  category: string;
  description: string;
  /** Dia-semântica: string 'yyyy-MM-dd', ISO ou Date — o service canoniza (meia-noite SP). */
  date?: Date | string;
  recurringTransactionId?: string;
}

export type UpdateTransactionData = Partial<{
  type: 'income' | 'expense';
  title: string;
  amount: string;
  categoryId: string;
  description: string;
  /** Dia-semântica: canonizada pelo service antes de persistir. */
  date: Date | string;
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
