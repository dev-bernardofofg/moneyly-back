import { sumAmounts } from '@core/helpers/amount';
import { computeSpendingStats } from '../helpers/spending-stats';
import { transactionRepository } from '../repositories/transaction.repository';
import type { TransactionFilters } from '../transaction.types';

export const getTransactionListUseCase = async (userId: string, filters: TransactionFilters) => {
  const txns = await transactionRepository.findByUserId(userId, filters);
  const totalExpense = sumAmounts(txns.filter((tx) => tx.type === 'expense'));
  const totalIncome = sumAmounts(txns.filter((tx) => tx.type === 'income'));
  const { percentUsed, alert } = computeSpendingStats(
    totalExpense,
    totalIncome,
    'Você já usou mais de 80% das entradas neste filtro!'
  );

  return { transactions: txns, totalExpense, totalIncome, percentUsed, alert };
};
