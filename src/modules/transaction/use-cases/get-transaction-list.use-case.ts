import { sumAmounts } from '../../../core/helpers/amount';
import { userRepository } from '../../user';
import { computeSpendingStats } from '../helpers/spending-stats';
import { transactionRepository } from '../repositories/transaction.repository';
import type { TransactionFilters } from '../transaction.types';

export const getTransactionListUseCase = async (userId: string, filters: TransactionFilters) => {
  const [txns, user] = await Promise.all([
    transactionRepository.findByUserId(userId, filters),
    userRepository.findById(userId),
  ]);

  const monthlyIncome = Number(user?.monthlyIncome) || 0;
  const totalExpense = sumAmounts(txns.filter((tx) => tx.type === 'expense'));
  const totalIncome = sumAmounts(txns.filter((tx) => tx.type === 'income'));
  const { percentUsed, alert } = computeSpendingStats(
    totalExpense,
    monthlyIncome,
    'Você já usou mais de 80% do seu rendimento mensal neste filtro!'
  );

  return { transactions: txns, totalExpense, totalIncome, monthlyIncome, percentUsed, alert };
};
