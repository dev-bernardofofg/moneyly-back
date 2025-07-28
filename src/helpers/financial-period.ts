import { formatInTimeZone } from "date-fns-tz";
import {
  createNormalizedSaoPauloDate,
  getCurrentSaoPauloDate,
  toSaoPauloTimezone,
} from "./date-utils";

export interface FinancialPeriod {
  startDate: Date;
  endDate: Date;
}

// Timezone de São Paulo
const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

/**
 * Normaliza um dia para o último dia válido do mês no timezone de São Paulo
 * @param year Ano
 * @param month Mês (0-11)
 * @param day Dia desejado
 * @returns Dia normalizado (não excede o último dia do mês)
 */
export function normalizeDayForMonth(
  year: number,
  month: number,
  day: number
): number {
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const lastDaySaoPaulo = toSaoPauloTimezone(lastDayOfMonth);
  return Math.min(day, lastDaySaoPaulo.getDate());
}

/**
 * Cria uma data normalizada para o período financeiro no timezone de São Paulo
 * @param year Ano
 * @param month Mês (0-11)
 * @param day Dia desejado
 * @returns Data normalizada no timezone de São Paulo
 */
export function createNormalizedDate(
  year: number,
  month: number,
  day: number
): Date {
  return createNormalizedSaoPauloDate(year, month, day);
}

/**
 * Calcula o período financeiro atual com normalização de datas no timezone de São Paulo
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @param referenceDate Data de referência (padrão: hoje em São Paulo)
 * @returns Objeto com data de início e fim do período financeiro
 */
export function getCurrentFinancialPeriod(
  financialDayStart: number,
  financialDayEnd: number,
  referenceDate: Date = getCurrentSaoPauloDate()
): FinancialPeriod {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-11
  const currentDay = referenceDate.getDate();

  let startDate: Date;
  let endDate: Date;

  // Se o dia atual é maior ou igual ao dia de início, o período começou neste mês
  if (currentDay >= financialDayStart) {
    startDate = createNormalizedDate(
      currentYear,
      currentMonth,
      financialDayStart
    );

    // Se o dia de fim é menor ou igual ao dia de início, vai para o próximo mês
    if (financialDayEnd <= financialDayStart) {
      endDate = createNormalizedDate(
        currentYear,
        currentMonth + 1,
        financialDayEnd
      );
    } else {
      endDate = createNormalizedDate(
        currentYear,
        currentMonth,
        financialDayEnd
      );
    }
  } else {
    // Se o dia atual é menor que o dia de início, o período começou no mês anterior
    startDate = createNormalizedDate(
      currentYear,
      currentMonth - 1,
      financialDayStart
    );

    // Se o dia de fim é menor ou igual ao dia de início, vai para este mês
    if (financialDayEnd <= financialDayStart) {
      endDate = createNormalizedDate(
        currentYear,
        currentMonth,
        financialDayEnd
      );
    } else {
      endDate = createNormalizedDate(
        currentYear,
        currentMonth - 1,
        financialDayEnd
      );
    }
  }

  return { startDate, endDate };
}

/**
 * Calcula o período financeiro para um mês específico no timezone de São Paulo
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @param year Ano desejado
 * @param month Mês desejado (1-12)
 * @returns Objeto com data de início e fim do período financeiro
 */
export function getFinancialPeriodForMonth(
  financialDayStart: number,
  financialDayEnd: number,
  year: number,
  month: number // 1-12
): FinancialPeriod {
  const monthIndex = month - 1; // Converter para 0-11

  let startDate: Date;
  let endDate: Date;

  // Se o dia de fim é menor ou igual ao dia de início, o período cruza meses
  if (financialDayEnd <= financialDayStart) {
    startDate = createNormalizedDate(year, monthIndex, financialDayStart);
    endDate = createNormalizedDate(year, monthIndex + 1, financialDayEnd);
  } else {
    startDate = createNormalizedDate(year, monthIndex, financialDayStart);
    endDate = createNormalizedDate(year, monthIndex, financialDayEnd);
  }

  return { startDate, endDate };
}

/**
 * Verifica se uma data está dentro do período financeiro atual no timezone de São Paulo
 * @param date Data a ser verificada
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @param referenceDate Data de referência (padrão: hoje em São Paulo)
 * @returns true se a data está no período financeiro atual
 */
export function isDateInCurrentFinancialPeriod(
  date: Date,
  financialDayStart: number,
  financialDayEnd: number,
  referenceDate: Date = getCurrentSaoPauloDate()
): boolean {
  const period = getCurrentFinancialPeriod(
    financialDayStart,
    financialDayEnd,
    referenceDate
  );

  const saoPauloDate = toSaoPauloTimezone(date);
  return saoPauloDate >= period.startDate && saoPauloDate <= period.endDate;
}

/**
 * Gera uma descrição legível do período financeiro
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @returns String descritiva do período
 */
export function getFinancialPeriodDescription(
  financialDayStart: number,
  financialDayEnd: number
): string {
  if (financialDayStart === financialDayEnd) {
    return `Dia ${financialDayStart} de cada mês`;
  }

  if (financialDayEnd < financialDayStart) {
    return `Dia ${financialDayStart} a ${financialDayEnd} do próximo mês`;
  }

  return `Dia ${financialDayStart} a ${financialDayEnd} do mesmo mês`;
}

/**
 * Calcula períodos financeiros anteriores para histórico no timezone de São Paulo
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @param numberOfPeriods Número de períodos anteriores a calcular
 * @param referenceDate Data de referência (padrão: hoje em São Paulo)
 * @returns Array de períodos financeiros, do mais recente ao mais antigo
 */
export function getPreviousFinancialPeriods(
  financialDayStart: number,
  financialDayEnd: number,
  numberOfPeriods: number = 6,
  referenceDate: Date = getCurrentSaoPauloDate()
): FinancialPeriod[] {
  const periods: FinancialPeriod[] = [];

  for (let i = 0; i < numberOfPeriods; i++) {
    // Calcular a data de referência para cada período anterior
    const periodReferenceDate = new Date(referenceDate);

    if (i === 0) {
      // Período atual
      periods.push(
        getCurrentFinancialPeriod(
          financialDayStart,
          financialDayEnd,
          periodReferenceDate
        )
      );
    } else {
      // Períodos anteriores
      // Retroceder pelo número de meses necessários
      const monthsToSubtract = i;
      periodReferenceDate.setMonth(
        periodReferenceDate.getMonth() - monthsToSubtract
      );

      periods.push(
        getCurrentFinancialPeriod(
          financialDayStart,
          financialDayEnd,
          periodReferenceDate
        )
      );
    }
  }

  return periods;
}

/**
 * Calcula o período financeiro mais antigo para buscar histórico no timezone de São Paulo
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @param numberOfPeriods Número de períodos para voltar
 * @param referenceDate Data de referência (padrão: hoje em São Paulo)
 * @returns Data de início do período mais antigo
 */
export function getHistoricalStartDate(
  financialDayStart: number,
  financialDayEnd: number,
  numberOfPeriods: number = 6,
  referenceDate: Date = getCurrentSaoPauloDate()
): Date {
  const periods = getPreviousFinancialPeriods(
    financialDayStart,
    financialDayEnd,
    numberOfPeriods,
    referenceDate
  );
  const oldestPeriod = periods[periods.length - 1];
  return oldestPeriod.startDate;
}

/**
 * Calcula todos os períodos financeiros disponíveis baseado nas transações do usuário no timezone de São Paulo
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @param transactions Transações do usuário
 * @returns Array de períodos financeiros com informações formatadas
 */

export interface IAvailablePeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  label: string;
  transactionCount: number;
}
export function getAvailableFinancialPeriods(
  financialDayStart: number,
  financialDayEnd: number,
  transactions: any[]
): Array<IAvailablePeriod> {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Encontrar a data mais antiga e mais recente das transações (convertidas para São Paulo)
  const dates = transactions.map((tx) => toSaoPauloTimezone(tx.date));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const periods: Array<{
    id: string;
    startDate: Date;
    endDate: Date;
    label: string;
    transactionCount: number;
  }> = [];

  // Calcular períodos a partir da data mais antiga até a mais recente
  let currentDate = new Date(minDate);

  while (currentDate <= maxDate) {
    const period = getCurrentFinancialPeriod(
      financialDayStart,
      financialDayEnd,
      currentDate
    );

    // Verificar se já temos este período
    const periodExists = periods.find(
      (p) =>
        p.startDate.getTime() === period.startDate.getTime() &&
        p.endDate.getTime() === period.endDate.getTime()
    );

    if (!periodExists) {
      // Contar transações neste período
      const periodTransactions = transactions.filter((tx) => {
        const txDate = toSaoPauloTimezone(tx.date);
        return txDate >= period.startDate && txDate <= period.endDate;
      });

      // Criar label formatado (ex: "Julho - Agosto")
      const startMonth = formatInTimeZone(
        period.startDate,
        SAO_PAULO_TIMEZONE,
        "MMMM"
      );
      const endMonth = formatInTimeZone(
        period.endDate,
        SAO_PAULO_TIMEZONE,
        "MMMM"
      );
      const startYear = period.startDate.getFullYear();
      const endYear = period.endDate.getFullYear();

      let label: string;
      if (startYear === endYear) {
        if (startMonth === endMonth) {
          label = `${startMonth} ${startYear}`;
        } else {
          label = `${startMonth} - ${endMonth} ${startYear}`;
        }
      } else {
        label = `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
      }

      periods.push({
        id: `${period.startDate.toISOString()}_${period.endDate.toISOString()}`,
        startDate: period.startDate,
        endDate: period.endDate,
        label: label.charAt(0).toUpperCase() + label.slice(1), // Capitalizar primeira letra
        transactionCount: periodTransactions.length,
      });
    }

    // Avançar para o próximo mês
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Ordenar por data (mais recente primeiro)
  return periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}
