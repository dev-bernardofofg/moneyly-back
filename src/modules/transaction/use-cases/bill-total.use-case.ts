import { financialPeriodService } from '@modules/financial-period';
import { transactionRepository } from '../repositories/transaction.repository';

/** Total da fatura do cartão que vence na data (compras do cartão no período do vencimento). */
export const billTotal = async (userId: string, cardId: string, dueDate: Date) => {
  const periodId = await financialPeriodService.findOrCreatePeriodForDate(userId, dueDate);
  const rows = await transactionRepository.sumExpensesByAccountAndCategory(userId, periodId, [
    cardId,
  ]);
  return rows.reduce((total, row) => total + row.total, 0);
};
