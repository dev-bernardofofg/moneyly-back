import {
  getCurrentFinancialPeriod,
  getFinancialPeriodForMonth,
} from "../helpers/financial-period";
import { toSaoPauloTimezone } from "../helpers/date-utils";
import { FinancialPeriodRepository } from "../repositories/financial-period.repository";
import { UserRepository } from "../repositories/user.repository";

export class FinancialPeriodService {
  static async ensureCurrentPeriodExists(userId: string): Promise<any> {
    // Buscar configuração do usuário
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const { financialDayStart, financialDayEnd } = user;

    // Calcular período atual
    const currentPeriod = getCurrentFinancialPeriod(
      financialDayStart || 1,
      financialDayEnd || 31
    );

    // Verificar se já existe, se não, criar
    return await FinancialPeriodRepository.findOrCreatePeriod(
      userId,
      currentPeriod.startDate,
      currentPeriod.endDate
    );
  }

  static async createPeriodForMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<any> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const { financialDayStart, financialDayEnd } = user;

    // Calcular período para o mês específico
    const period = getFinancialPeriodForMonth(
      financialDayStart || 1,
      financialDayEnd || 31,
      year,
      month
    );

    // Criar período
    return await FinancialPeriodRepository.create({
      userId,
      startDate: period.startDate,
      endDate: period.endDate,
      isActive: true,
    });
  }

  /**
   * Encontra ou cria o período financeiro correspondente a uma data específica
   * e retorna o UUID real do banco.
   */
  static async findOrCreatePeriodForDate(
    userId: string,
    date: Date
  ): Promise<string> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const { financialDayStart, financialDayEnd } = user;

    const period = getCurrentFinancialPeriod(
      financialDayStart ?? 1,
      financialDayEnd ?? 31,
      toSaoPauloTimezone(date)
    );

    const stored = await FinancialPeriodRepository.findOrCreatePeriod(
      userId,
      period.startDate,
      period.endDate
    );

    return stored.id;
  }

  static async createNextPeriods(
    userId: string,
    numberOfPeriods: number = 3
  ): Promise<any[]> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const { financialDayStart, financialDayEnd } = user;
    const periods: Array<{
      id: string;
      userId: string;
      startDate: Date;
      endDate: Date;
      isActive: boolean | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    // Calcular próximos períodos
    const currentDate = new Date();

    for (let i = 0; i < numberOfPeriods; i++) {
      const futureDate = new Date(currentDate);
      futureDate.setMonth(futureDate.getMonth() + i);

      const period = getCurrentFinancialPeriod(
        financialDayStart || 1,
        financialDayEnd || 31,
        futureDate
      );

      const createdPeriod = await FinancialPeriodRepository.findOrCreatePeriod(
        userId,
        period.startDate,
        period.endDate
      );

      periods.push(createdPeriod);
    }

    return periods;
  }
}
