import { buildComparison, type ComparativeInsights } from '../helpers/comparative-insights';
import { formatPeriodLabel, getPreviousFinancialPeriods } from '@modules/financial-period';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { userRepository } from '@modules/user';
import { HttpError } from '@core/errors/http-error';
import { requireUser } from '@modules/user';

export const getComparativeInsightsUseCase = async (
  userId: string,
  periodsBack = 3
): Promise<ComparativeInsights> => {
  await requireUser(userId);

  const user = await userRepository.findById(userId);
  if (!user) throw new HttpError(404, 'Usuário não encontrado');

  // current + N anteriores
  const raw = getPreviousFinancialPeriods(
    user.financialDayStart ?? 1,
    user.financialDayEnd ?? 31,
    periodsBack + 1
  );

  const periods = raw.map((p) => ({
    startDate: p.startDate,
    endDate: p.endDate,
    label: formatPeriodLabel(p.startDate, p.endDate),
  }));

  const transactions = await transactionRepository.findAllByUserId(userId);
  return buildComparison(transactions, periods);
};
