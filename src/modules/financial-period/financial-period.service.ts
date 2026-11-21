import type { FinancialPeriod } from '@infra/db/schema';
import {
  formatPeriodLabel,
  getCurrentFinancialPeriod,
  getFinancialPeriodForMonth,
} from './helpers/financial-period';
import { spMidnightOf, spParts } from '@core/helpers/dates';
import { financialPeriodRepository } from './repositories/financial-period.repository';
import { HttpError } from '@core/errors/http-error';

async function getPeriodDays(userId: string) {
  const days = await financialPeriodRepository.findUserPeriodDays(userId);
  if (!days) throw new HttpError(404, 'Usuário não encontrado');
  return days;
}

export const financialPeriodService = {
  async ensureCurrentPeriodExists(userId: string): Promise<FinancialPeriod> {
    const days = await getPeriodDays(userId);
    const currentPeriod = getCurrentFinancialPeriod(
      days.financialDayStart || 1,
      days.financialDayEnd || 31
    );
    return financialPeriodRepository.findOrCreatePeriod(
      userId,
      currentPeriod.startDate,
      currentPeriod.endDate
    );
  },

  async createPeriodForMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<FinancialPeriod> {
    const days = await getPeriodDays(userId);
    const period = getFinancialPeriodForMonth(
      days.financialDayStart || 1,
      days.financialDayEnd || 31,
      year,
      month
    );
    return financialPeriodRepository.create({
      userId,
      startDate: period.startDate,
      endDate: period.endDate,
      isActive: true,
    });
  },

  async findOrCreatePeriodForDate(userId: string, date: Date): Promise<string> {
    const days = await getPeriodDays(userId);
    // getCurrentFinancialPeriod extrai o dia SP do instante internamente.
    const period = getCurrentFinancialPeriod(
      days.financialDayStart ?? 1,
      days.financialDayEnd ?? 31,
      date
    );
    const stored = await financialPeriodRepository.findOrCreatePeriod(
      userId,
      period.startDate,
      period.endDate
    );
    return stored.id;
  },

  async getUserPeriods(userId: string) {
    const stored = await financialPeriodRepository.findAllByUserWithTransactionCount(userId);
    const now = new Date();
    return stored.map((p) => ({
      id: p.id,
      startDate: p.startDate,
      endDate: p.endDate,
      label: formatPeriodLabel(p.startDate, p.endDate),
      transactionCount: p.transactionCount,
      isStored: true,
      isCurrent: now >= p.startDate && now <= p.endDate,
    }));
  },

  async getPeriodById(periodId: string, userId: string) {
    return financialPeriodRepository.findById(periodId, userId);
  },

  async createNextPeriods(userId: string, numberOfPeriods: number = 3): Promise<FinancialPeriod[]> {
    const days = await getPeriodDays(userId);
    const periods: FinancialPeriod[] = [];
    const { year, month } = spParts(new Date());

    for (let i = 0; i < numberOfPeriods; i++) {
      // Âncora no dia 15 do mês alvo: imune a overflow de fim de mês.
      const futureDate = spMidnightOf(year, month + i, 15);
      const period = getCurrentFinancialPeriod(
        days.financialDayStart || 1,
        days.financialDayEnd || 31,
        futureDate
      );
      const created = await financialPeriodRepository.findOrCreatePeriod(
        userId,
        period.startDate,
        period.endDate
      );
      periods.push(created);
    }

    return periods;
  },
};
