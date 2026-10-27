import { HttpError } from '@core/errors/http-error';
import { financialPeriodService, formatPeriodLabel } from '@modules/financial-period';
import { financialPeriodRepository } from '@modules/financial-period/repositories/financial-period.repository';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { buildPeriodInsights } from '../helpers/period-insights';
import { getForecastUseCase } from './get-forecast.use-case';

const HISTORY_SIZE = 6;

export const getFinancialInsightsUseCase = async (userId: string, periodId?: string) => {
  const period = periodId
    ? await financialPeriodService.getPeriodById(periodId, userId)
    : await financialPeriodService.ensureCurrentPeriodExists(userId);
  if (!period) throw new HttpError(404, 'Período não encontrado');

  const start = new Date(period.startDate);
  const earlier = (await financialPeriodRepository.findActiveByUser(userId)).filter(
    (candidate) => candidate.id !== period.id && new Date(candidate.startDate) < start
  );
  const periods = [...earlier, period].slice(-HISTORY_SIZE).map((item) => ({
    id: item.id,
    startDate: new Date(item.startDate),
    endDate: new Date(item.endDate),
    label: formatPeriodLabel(new Date(item.startDate), new Date(item.endDate)),
  }));

  // Em andamento: as contas recorrentes que ainda vão cair entram na previsão de gasto.
  const isOpen = Date.now() <= new Date(period.endDate).getTime();
  const [totals, forecast] = await Promise.all([
    transactionRepository.sumByPeriodAndCategory(
      userId,
      periods.map((item) => item.id)
    ),
    isOpen ? getForecastUseCase(userId, period.id) : null,
  ]);

  return buildPeriodInsights({
    periods,
    selectedId: period.id,
    totals,
    upcomingExpense: forecast?.projected.recurringExpense ?? 0,
    isOpen,
  });
};
