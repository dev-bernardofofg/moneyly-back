import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Category } from "../../db/schema";
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

  const balance = monthlyIncome - totalExpense;
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

export const getRecentTransactions = (
  transactions: TransactionWithCategory[],
  categories: Category[]
) => {
  const categoriesMap = categories.reduce((map, category) => {
    map[category.id] = category;
    return map;
  }, {} as Record<string, Category>);

  return transactions
    .map((tx) => {
      const category = categoriesMap[tx.category.id];
      return {
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        date: format(new Date(tx.date), "dd/MM/yyyy"),
        category: category ? category.name : "Categoria não encontrada",
        description: tx.description || "",
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.date.split("/").reverse().join("-"));
      const dateB = new Date(b.date.split("/").reverse().join("-"));
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);
};

export const calculateExpensesByCategory = (
  transactions: TransactionWithCategory[],
  categories: Category[]
) => {
  const expensesByCategory: Record<
    string,
    {
      id: string;
      name: string;
      amount: number;
      percentage: number;
    }
  > = {};

  // Inicializar todas as categorias com 0
  categories.forEach((category) => {
    expensesByCategory[category.id] = {
      id: category.id,
      name: category.name,
      amount: 0,
      percentage: 0,
    };
  });

  // Calcular gastos por categoria
  const expenseTransactions = transactions.filter(
    (tx) => tx.type === "expense"
  );
  const totalExpenses = expenseTransactions.reduce(
    (sum, tx) => sum + Number(tx.amount),
    0
  );

  expenseTransactions.forEach((tx) => {
    const category = expensesByCategory[tx.category.id];
    if (category) {
      category.amount += Number(tx.amount);
    }
  });

  // Calcular percentuais
  Object.keys(expensesByCategory).forEach((categoryId) => {
    const category = expensesByCategory[categoryId];
    if (category) {
      category.percentage =
        totalExpenses > 0
          ? Number(((category.amount / totalExpenses) * 100).toFixed(2))
          : 0;
    }
  });

  return Object.values(expensesByCategory)
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
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
