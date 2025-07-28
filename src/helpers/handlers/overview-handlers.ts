import { format } from "date-fns";

export const calculateStats = (transactions: any[], monthlyIncome: number) => {
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

export const calculateMonthlyHistory = (
  transactions: any[],
  categories: any[]
) => {
  // Criar um mapa de categorias para facilitar a busca
  const categoriesMap = categories.reduce((map, category) => {
    map[category.id] = category;
    return map;
  }, {} as Record<string, any>);

  // Transformar transações em formato desejado
  const monthlyHistory = transactions.map((tx) => {
    const category = categoriesMap[tx.category.id];

    return {
      id: tx.id,
      type: tx.type, // Mantém "income" ou "expense"
      amount: Number(tx.amount),
      date: format(new Date(tx.date), "dd/MM/yyyy"),
      category: category ? category.name : "Categoria não encontrada",
      description: tx.description || "",
    };
  });

  // Ordenar por data (mais recente primeiro) e pegar apenas as últimas 5
  return monthlyHistory
    .sort((a, b) => {
      const dateA = new Date(a.date.split("/").reverse().join("-"));
      const dateB = new Date(b.date.split("/").reverse().join("-"));
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5); // Retorna apenas as últimas 5 transações
};

export const calculateExpensesByCategory = (
  transactions: any[],
  categories: any[]
) => {
  const expensesByCategory: Record<string, any> = {};

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
    if (expensesByCategory[tx.category.id]) {
      expensesByCategory[tx.category.id].amount += Number(tx.amount);
    }
  });

  // Calcular percentuais
  Object.keys(expensesByCategory).forEach((categoryId) => {
    const category = expensesByCategory[categoryId];
    category.percentage =
      totalExpenses > 0
        ? Number(((category.amount / totalExpenses) * 100).toFixed(2))
        : 0;
  });

  return Object.values(expensesByCategory)
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}