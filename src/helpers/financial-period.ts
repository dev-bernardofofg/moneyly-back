import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { transactionRepository } from '../repositories/transaction.repository';
import { createNormalizedSaoPauloDate, getCurrentSaoPauloDate, toSaoPauloTimezone } from './dates';

export interface FinancialPeriod {
  startDate: Date;
  endDate: Date;
}

// Timezone de São Paulo
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Normaliza um dia para o último dia válido do mês no timezone de São Paulo
 * @param year Ano
 * @param month Mês (0-11)
 * @param day Dia desejado
 * @returns Dia normalizado (não excede o último dia do mês)
 */
export function normalizeDayForMonth(year: number, month: number, day: number): number {
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
export function createNormalizedDate(year: number, month: number, day: number): Date {
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
    startDate = createNormalizedDate(currentYear, currentMonth, financialDayStart);

    // Se o dia de fim é menor ou igual ao dia de início, vai para o próximo mês
    if (financialDayEnd <= financialDayStart) {
      endDate = createNormalizedDate(currentYear, currentMonth + 1, financialDayEnd);
    } else {
      endDate = createNormalizedDate(currentYear, currentMonth, financialDayEnd);
    }
  } else {
    // Se o dia atual é menor que o dia de início, o período começou no mês anterior
    startDate = createNormalizedDate(currentYear, currentMonth - 1, financialDayStart);

    // Se o dia de fim é menor ou igual ao dia de início, vai para este mês
    if (financialDayEnd <= financialDayStart) {
      endDate = createNormalizedDate(currentYear, currentMonth, financialDayEnd);
    } else {
      endDate = createNormalizedDate(currentYear, currentMonth - 1, financialDayEnd);
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
  const period = getCurrentFinancialPeriod(financialDayStart, financialDayEnd, referenceDate);

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
        getCurrentFinancialPeriod(financialDayStart, financialDayEnd, periodReferenceDate)
      );
    } else {
      // Períodos anteriores
      // Retroceder pelo número de meses necessários
      const monthsToSubtract = i;
      periodReferenceDate.setMonth(periodReferenceDate.getMonth() - monthsToSubtract);

      periods.push(
        getCurrentFinancialPeriod(financialDayStart, financialDayEnd, periodReferenceDate)
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
  if (!oldestPeriod) {
    throw new Error('Nenhum período financeiro encontrado');
  }
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
  isStored?: boolean; // ← ADICIONAR ESTE CAMPO
}

export function getAvailableFinancialPeriods(
  financialDayStart: number,
  financialDayEnd: number,
  transactions: Array<{ id: string; date: Date }>
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
  let iterationCount = 0;
  const maxIterations = 50; // Proteção contra loop infinito

  while (currentDate <= maxDate && iterationCount < maxIterations) {
    iterationCount++;

    const period = getCurrentFinancialPeriod(financialDayStart, financialDayEnd, currentDate);

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

      // Criar label formatado em português (ex: "Julho - Agosto")
      const startMonth = formatInTimeZone(period.startDate, SAO_PAULO_TIMEZONE, 'MMMM', {
        locale: ptBR,
      });
      const endMonth = formatInTimeZone(period.endDate, SAO_PAULO_TIMEZONE, 'MMMM', {
        locale: ptBR,
      });
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

      // Capitalizar primeira letra de cada mês
      const capitalizedLabel = label.replace(/\b\w/g, (char) => char.toUpperCase());

      const periodId = `${period.startDate.toISOString()}_${period.endDate.toISOString()}`;

      periods.push({
        id: periodId,
        startDate: period.startDate,
        endDate: period.endDate,
        label: capitalizedLabel,
        transactionCount: periodTransactions.length,
      });
    }

    // Avançar para o próximo mês
    const previousMonth = currentDate.getMonth();
    currentDate.setMonth(currentDate.getMonth() + 1);
    const newMonth = currentDate.getMonth();

    // Verificar se não estamos em um loop infinito
    if (newMonth === previousMonth && iterationCount > 1) {
      break;
    }
  }

  // Ordenar por data (mais recente primeiro)
  return periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

/**
 * Gera todos os períodos financeiros disponíveis para um usuário
 * Inclui períodos passados, atual e futuros, com contagem REAL de transações
 * @param userId ID do usuário para consultar transações
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @param numberOfPastPeriods Número de períodos passados a incluir (padrão: 6)
 * @param numberOfFuturePeriods Número de períodos futuros a incluir (padrão: 3)
 * @returns Array de períodos financeiros com contagem real de transações
 */
export async function getAllAvailableFinancialPeriodsWithTransactions(
  userId: string,
  financialDayStart: number,
  financialDayEnd: number,
  numberOfPastPeriods: number = 6,
  numberOfFuturePeriods: number = 3
): Promise<Array<IAvailablePeriod>> {
  const periods: Array<IAvailablePeriod> = [];
  const currentDate = getCurrentSaoPauloDate();

  // Períodos passados
  for (let i = numberOfPastPeriods; i >= 1; i--) {
    const pastDate = new Date(currentDate);
    pastDate.setMonth(pastDate.getMonth() - i);

    const period = getCurrentFinancialPeriod(financialDayStart, financialDayEnd, pastDate);

    // 🎯 CONSULTAR BANCO para este período
    const transactionCount = await getTransactionCountForPeriod(userId, period);

    periods.push({
      id: `${period.startDate.toISOString()}_${period.endDate.toISOString()}`,
      startDate: period.startDate,
      endDate: period.endDate,
      label: formatPeriodLabel(period.startDate, period.endDate),
      transactionCount, // ← CONTAGEM REAL do banco!
    });
  }

  // Período atual
  const currentPeriod = getCurrentFinancialPeriod(financialDayStart, financialDayEnd, currentDate);

  // 🎯 CONSULTAR BANCO para período atual
  const currentTransactionCount = await getTransactionCountForPeriod(userId, currentPeriod);

  periods.push({
    id: `${currentPeriod.startDate.toISOString()}_${currentPeriod.endDate.toISOString()}`,
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
    label: formatPeriodLabel(currentPeriod.startDate, currentPeriod.endDate),
    transactionCount: currentTransactionCount, // ← CONTAGEM REAL do banco!
  });

  // Períodos futuros
  for (let i = 1; i <= numberOfFuturePeriods; i++) {
    const futureDate = new Date(currentDate);
    futureDate.setMonth(futureDate.getMonth() + i);

    const period = getCurrentFinancialPeriod(financialDayStart, financialDayEnd, futureDate);

    // 🎯 CONSULTAR BANCO para período futuro
    const futureTransactionCount = await getTransactionCountForPeriod(userId, period);

    periods.push({
      id: `${period.startDate.toISOString()}_${period.endDate.toISOString()}`,
      startDate: period.startDate,
      endDate: period.endDate,
      label: formatPeriodLabel(period.startDate, period.endDate),
      transactionCount: futureTransactionCount, // ← CONTAGEM REAL do banco!
    });
  }

  return periods;
}

/**
 * Consulta o banco para contar transações em um período específico
 * @param userId ID do usuário
 * @param period Período financeiro (startDate e endDate)
 * @returns Número de transações no período
 */
async function getTransactionCountForPeriod(
  userId: string,
  period: FinancialPeriod
): Promise<number> {
  try {
    // Buscar transações por data (fallback para quando não há periodId)
    const transactions = await transactionRepository.findByUserId(userId, {
      startDate: period.startDate,
      endDate: period.endDate,
    });

    return transactions.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Formata o label do período em português
 */
export function formatPeriodLabel(startDate: Date, endDate: Date): string {
  const startMonth = formatInTimeZone(startDate, SAO_PAULO_TIMEZONE, 'MMMM', {
    locale: ptBR,
  });
  const endMonth = formatInTimeZone(endDate, SAO_PAULO_TIMEZONE, 'MMMM', {
    locale: ptBR,
  });
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

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

  return label.replace(/\b\w/g, (char) => char.toUpperCase());
}
