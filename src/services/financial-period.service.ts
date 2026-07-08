import type { FinancialPeriod } from '../db/schema';
import {
  formatPeriodLabel,
  getCurrentFinancialPeriod,
  getFinancialPeriodForMonth,
} from '../helpers/financial-period';
import { spMidnightOf, spParts } from '../helpers/dates';
import { financialPeriodRepository } from '../repositories/financial-period.repository';
import { userRepository } from '../repositories/user.repository';
import { HttpError } from '../validations/errors';

async function getUser(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) throw new HttpError(404, 'Usuário não encontrado');
  return user;
}

export const financialPeriodService = {
  async ensureCurrentPeriodExists(userId: string): Promise<FinancialPeriod> {
    const user = await getUser(userId);
    const currentPeriod = getCurrentFinancialPeriod(
      user.financialDayStart || 1,
      user.financialDayEnd || 31
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
    const user = await getUser(userId);
    const period = getFinancialPeriodForMonth(
      user.financialDayStart || 1,
      user.financialDayEnd || 31,
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
    const user = await getUser(userId);
    // getCurrentFinancialPeriod extrai o dia SP do instante internamente.
    const period = getCurrentFinancialPeriod(
      user.financialDayStart ?? 1,
      user.financialDayEnd ?? 31,
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
    const user = await getUser(userId);
    const periods: FinancialPeriod[] = [];
    const { year, month } = spParts(new Date());

    for (let i = 0; i < numberOfPeriods; i++) {
      // Âncora no dia 15 do mês alvo: imune a overflow de fim de mês.
      const futureDate = spMidnightOf(year, month + i, 15);
      const period = getCurrentFinancialPeriod(
        user.financialDayStart || 1,
        user.financialDayEnd || 31,
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
