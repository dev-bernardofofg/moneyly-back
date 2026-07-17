import { userRepository } from '../../user';
import { computeSpendingStats } from '../helpers/spending-stats';
import { transactionRepository } from '../repositories/transaction.repository';

export const getTransactionSummaryUseCase = async (userId: string) => {
  const [allTxns, user] = await Promise.all([
    transactionRepository.findAllByUserId(userId),
    userRepository.findById(userId),
  ]);

  let realIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of allTxns) {
    if (tx.type === 'income') realIncome += Number(tx.amount);
    if (tx.type === 'expense') totalExpense += Number(tx.amount);
    byCategory[tx.category.id] = (byCategory[tx.category.id] || 0) + Number(tx.amount);
  }

  const monthlyIncome = Number(user?.monthlyIncome) || 0;
  const balance = monthlyIncome - totalExpense;
  const { percentUsed, alert } = computeSpendingStats(
    totalExpense,
    monthlyIncome,
    'Você já usou mais de 80% do seu rendimento mensal!'
  );

  return {
    totalIncome: realIncome,
    totalExpenses: totalExpense,
    monthlyIncome,
    balance,
    percentUsed,
    byCategory,
    alert,
  };
};
