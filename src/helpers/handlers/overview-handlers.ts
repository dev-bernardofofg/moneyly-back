import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TransactionWithCategory } from "../../repositories/transaction.repository";

export const calculateStats = (
  transactions: TransactionWithCategory[],
  monthlyIncome: number
) => {
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const balance = (monthlyIncome + totalIncome) - totalExpense;
  const percentUsed =
    monthlyIncome > 0
      ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
      : null;

  return {
    totalIncome,
    totalExpense,
    balance,
    percentUsed,
    remainingBudget: Math.max(0, monthlyIncome - totalExpense),
  };
};

export type RecentTransactionItem = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  category: string;
  description: string;
};

export const getRecentTransactions = (
  transactions: TransactionWithCategory[]
): RecentTransactionItem[] => {
  return transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      date: format(new Date(tx.date), "dd/MM/yyyy"),
      category: tx.category.name,
      description: tx.description || "",
    }));
};

export type CategoryChartItem = {
  name: string;
  income: number;
  expense: number;
};

export type ChartCategory = {
  id: string;
  name: string;
};

export const calculatePeriodChartData = (
  transactions: TransactionWithCategory[]
): { data: CategoryChartItem[]; categories: ChartCategory[] } => {
  const categoryMap: Record<string, { name: string; income: number; expense: number }> = {};

  transactions.forEach((tx) => {
    const { id, name } = tx.category;
    if (!categoryMap[id]) categoryMap[id] = { name, income: 0, expense: 0 };
    if (tx.type === "income") {
      categoryMap[id]!.income += Number(tx.amount);
    } else {
      categoryMap[id]!.expense += Number(tx.amount);
    }
  });

  const data: CategoryChartItem[] = Object.values(categoryMap).map((vals) => ({
    name: vals.name,
    income: Number(vals.income.toFixed(2)),
    expense: Number(vals.expense.toFixed(2)),
  }));

  const categories: ChartCategory[] = Object.entries(categoryMap).map(([id, vals]) => ({
    id,
    name: vals.name,
  }));

  return { data, categories };
};

export const calculateMonthlyAggregates = (
  allTransactions: TransactionWithCategory[]
): Array<{
  month: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
}> => {
  const monthMap: Record<string, { income: number; expense: number }> = {};

  allTransactions.forEach((tx) => {
    const key = format(new Date(tx.date), "yyyy-MM");
    if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0 };
    if (tx.type === "income") monthMap[key]!.income += Number(tx.amount);
    else monthMap[key]!.expense += Number(tx.amount);
  });

  return Object.entries(monthMap)
    .map(([month, data]) => ({
      month,
      label: format(new Date(month + "-01"), "MMMM yyyy", { locale: ptBR }),
      income: Number(data.income.toFixed(2)),
      expense: Number(data.expense.toFixed(2)),
      balance: Number((data.income - data.expense).toFixed(2)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};
