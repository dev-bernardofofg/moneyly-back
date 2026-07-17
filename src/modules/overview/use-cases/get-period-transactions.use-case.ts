import { getCurrentSaoPauloDate } from '../../../core/helpers/dates';
import { formatPeriodLabel, getCurrentFinancialPeriod } from '../../financial-period';
import { financialPeriodRepository } from '../../financial-period/repositories/financial-period.repository';
import type { TransactionWithCategory } from '../../transaction';
import { transactionRepository } from '../../transaction';

export const getPeriodTransactionsUseCase = async (
  userId: string,
  financial?: { startDay: number; endDay: number },
  periodId?: string
) => {
  const storedPeriods = await financialPeriodRepository.findAllByUserWithTransactionCount(userId);

  const availablePeriods = storedPeriods.map((p) => ({
    id: p.id,
    startDate: p.startDate,
    endDate: p.endDate,
    label: formatPeriodLabel(p.startDate, p.endDate),
    transactionCount: p.transactionCount,
  }));

  let selectedPeriod: (typeof availablePeriods)[0] | undefined;

  if (periodId) {
    selectedPeriod = availablePeriods.find((p) => p.id === periodId);
  } else if (financial) {
    const currentPeriod = getCurrentFinancialPeriod(financial.startDay, financial.endDay);
    selectedPeriod = availablePeriods.find(
      (p) =>
        p.startDate.getTime() === currentPeriod.startDate.getTime() &&
        p.endDate.getTime() === currentPeriod.endDate.getTime()
    );
  }

  let transactions: TransactionWithCategory[];
  if (selectedPeriod) {
    transactions = await transactionRepository.findByPeriodId(userId, selectedPeriod.id);
  } else if (periodId) {
    transactions = [];
  } else {
    const today = getCurrentSaoPauloDate();
    const currentPeriod = financial
      ? getCurrentFinancialPeriod(financial.startDay, financial.endDay)
      : { startDate: new Date(today.getFullYear(), today.getMonth(), 1), endDate: today };
    transactions = await transactionRepository.findByUserId(userId, {
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
    });
  }

  return { transactions, availablePeriods, selectedPeriod };
};
