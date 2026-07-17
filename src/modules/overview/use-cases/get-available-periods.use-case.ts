import { formatPeriodLabel } from '../../financial-period';
import { financialPeriodRepository } from '../../financial-period/repositories/financial-period.repository';

export const getAvailablePeriodsUseCase = async (userId: string) => {
  const storedPeriods = await financialPeriodRepository.findAllByUserWithTransactionCount(userId);

  return storedPeriods.map((p) => ({
    id: p.id,
    startDate: p.startDate,
    endDate: p.endDate,
    label: formatPeriodLabel(p.startDate, p.endDate),
    transactionCount: p.transactionCount,
  }));
};
