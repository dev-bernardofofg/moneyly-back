import { computeSpendingStats } from '../helpers/spending-stats';
import { transactionRepository } from '../repositories/transaction.repository';

export const getTransactionSummaryUseCase = async (userId: string) => {
  const allTxns = await transactionRepository.findAllByUserId(userId);

  let realIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of allTxns) {
    if (tx.type === 'income') realIncome += Number(tx.amount);
    if (tx.type === 'expense') totalExpense += Number(tx.amount);
    byCategory[tx.category.id] = (byCategory[tx.category.id] || 0) + Number(tx.amount);
  }

  const balance = realIncome - totalExpense;
  const { percentUsed, alert } = computeSpendingStats(
    totalExpense,
    realIncome,
    'Você já usou mais de 80% das suas entradas!'
  );

  return {
    totalIncome: realIncome,
    totalExpenses: totalExpense,
    balance,
    percentUsed,
    byCategory,
    alert,
  };
};
