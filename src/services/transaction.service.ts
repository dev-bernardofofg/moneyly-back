import { format } from "date-fns";
import { getCurrentFinancialPeriod } from "../helpers/financial-period";
import type { PaginationQuery } from "../helpers/pagination";
import { toSaoPauloTimezone } from "../helpers/dates";
import { transactionRepository } from "../repositories/transaction.repository";
import { userRepository } from "../repositories/user.repository";
import type { ITransaction, TransactionFilters } from "../types/transaction.types";
import { financialPeriodService } from "./financial-period.service";
import { validateCategoryExistsForUser } from "../validations/transaction.validation";
import { HttpError } from "../validations/errors";

export const createTransactionService = async (
  userId: string,
  transaction: ITransaction
) => {
  await validateCategoryExistsForUser(transaction.category, userId);

  const transactionDate = transaction.date
    ? toSaoPauloTimezone(transaction.date)
    : toSaoPauloTimezone(new Date());

  const periodId = await financialPeriodService.findOrCreatePeriodForDate(
    userId,
    transactionDate
  );

  const newTransaction = await transactionRepository.create({
    userId,
    type: transaction.type,
    title: transaction.title,
    amount: transaction.amount,
    categoryId: transaction.category,
    description: transaction.description,
    date: transactionDate,
    periodId,
  });

  return newTransaction;
};

export const updateTransactionService = async (
  id: string,
  userId: string,
  updateData: Partial<{
    type: "income" | "expense";
    title: string;
    amount: string;
    categoryId: string;
    description: string;
    date: Date;
    periodId: string;
  }>
) => {
  if (updateData.categoryId) {
    await validateCategoryExistsForUser(updateData.categoryId, userId);
  }
  
  if (updateData.date) {
    updateData.date = toSaoPauloTimezone(updateData.date);
    updateData.periodId =
      await financialPeriodService.findOrCreatePeriodForDate(
        userId,
        updateData.date
      );
  }

  const transaction = await transactionRepository.update(
    id,
    userId,
    updateData
  );

  if (!transaction) throw new HttpError(404, "Transação não encontrada");

  return transaction;
};

export const getTransactionsPaginatedService = async (
  userId: string,
  pagination: PaginationQuery,
  filters: { category?: string; startDate?: Date; endDate?: Date }
) => {
  return transactionRepository.findByUserIdPaginated(userId, pagination, filters);
};

export const deleteTransactionService = async (id: string, userId: string) => {
  const deleted = await transactionRepository.delete(id, userId);
  if (!deleted) throw new HttpError(404, "Transação não encontrada");
  return deleted;
};

const computeSpendingStats = (
  totalExpense: number,
  monthlyIncome: number,
  alertMsg: string
) => {
  const percentUsed =
    monthlyIncome > 0
      ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
      : null;
  const alert =
    percentUsed !== null && percentUsed >= 80 ? alertMsg : null;
  return { percentUsed, alert };
};

export const getTransactionListService = async (
  userId: string,
  filters: TransactionFilters
) => {
  const [txns, user] = await Promise.all([
    transactionRepository.findByUserId(userId, filters),
    userRepository.findById(userId),
  ]);

  const monthlyIncome = Number(user?.monthlyIncome) || 0;
  const totalExpense = txns
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalIncome = txns
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const { percentUsed, alert } = computeSpendingStats(
    totalExpense,
    monthlyIncome,
    "Você já usou mais de 80% do seu rendimento mensal neste filtro!"
  );

  return { transactions: txns, totalExpense, totalIncome, monthlyIncome, percentUsed, alert };
};

export const getTransactionSummaryService = async (userId: string) => {
  const [allTxns, user] = await Promise.all([
    transactionRepository.findAllByUserId(userId),
    userRepository.findById(userId),
  ]);

  let realIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of allTxns) {
    if (tx.type === "income") realIncome += Number(tx.amount);
    if (tx.type === "expense") totalExpense += Number(tx.amount);
    byCategory[tx.category.id] = (byCategory[tx.category.id] || 0) + Number(tx.amount);
  }

  const monthlyIncome = Number(user?.monthlyIncome) || 0;
  const balance = monthlyIncome - totalExpense;
  const { percentUsed, alert } = computeSpendingStats(
    totalExpense,
    monthlyIncome,
    "Você já usou mais de 80% do seu rendimento mensal!"
  );

  return { totalIncome: realIncome, totalExpenses: totalExpense, monthlyIncome, balance, percentUsed, byCategory, alert };
};

export const getMonthlySummaryService = async (
  userId: string,
  filters: { startDate?: Date; endDate?: Date }
) => {
  const [txns, user] = await Promise.all([
    transactionRepository.findByUserId(userId, filters),
    userRepository.findById(userId),
  ]);

  const monthlyIncome = Number(user?.monthlyIncome) || 0;
  const summary: Record<
    string,
    { income: number; expense: number; percentUsed: number | null; alert: string | null }
  > = {};

  for (const tx of txns) {
    const monthKey = format(new Date(tx.date), "yyyy-MM");
    if (!summary[monthKey]) {
      summary[monthKey] = { income: 0, expense: 0, percentUsed: null, alert: null };
    }
    if (tx.type === "income") summary[monthKey]!.income += Number(tx.amount);
    else summary[monthKey]!.expense += Number(tx.amount);
  }

  for (const monthData of Object.values(summary)) {
    const stats = computeSpendingStats(
      monthData.expense,
      monthlyIncome,
      "Você já usou mais de 80% do seu rendimento mensal!"
    );
    monthData.percentUsed = stats.percentUsed;
    monthData.alert = stats.alert;
  }

  return Object.entries(summary).map(([month, data]) => ({ month, ...data }));
};

export const getCurrentPeriodSummaryService = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error("Usuário não encontrado");

  const financialDayStart = user.financialDayStart ?? 1;
  const financialDayEnd = user.financialDayEnd ?? 31;
  const monthlyIncome = Number(user.monthlyIncome) || 0;
  const currentPeriod = getCurrentFinancialPeriod(financialDayStart, financialDayEnd);

  const txns = await transactionRepository.findByUserId(userId, {
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
  });

  let realIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of txns) {
    if (tx.type === "income") realIncome += Number(tx.amount);
    if (tx.type === "expense") totalExpense += Number(tx.amount);
    byCategory[tx.category.id] = (byCategory[tx.category.id] || 0) + Number(tx.amount);
  }

  const balance = monthlyIncome - totalExpense;
  const { percentUsed, alert } = computeSpendingStats(
    totalExpense,
    monthlyIncome,
    "Você já usou mais de 80% do seu rendimento mensal no período atual!"
  );

  return {
    currentPeriod: {
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
      description: `Período financeiro: ${format(currentPeriod.startDate, "dd/MM/yyyy")} a ${format(currentPeriod.endDate, "dd/MM/yyyy")}`,
    },
    totalIncome: realIncome,
    totalExpenses: totalExpense,
    monthlyIncome,
    balance,
    percentUsed,
    byCategory,
    alert,
    transactionsCount: txns.length,
  };
};
