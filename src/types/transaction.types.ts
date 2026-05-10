import type { TransactionWithCategory } from "../repositories/transaction.repository";

export type TransactionWithCategoryName = TransactionWithCategory;

export interface ITransaction {
  type: "income" | "expense";
  title: string;
  amount: string;
  category: string;
  description: string;
  date: Date;
}

export interface TransactionFilters {
  category?: string;
  startDate?: Date;
  endDate?: Date;
}

// Tipo para sumário de transações
export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

// Tipo para estatísticas de transações
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

// Tipo para dados de gráfico por categoria
export interface CategoryChartData {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  color?: string;
}
