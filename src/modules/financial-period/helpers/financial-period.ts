import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { spMidnightOf, spParts } from '@core/helpers/dates';

export interface FinancialPeriod {
  startDate: Date;
  endDate: Date;
}

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Período financeiro que CONTÉM a data de referência, no calendário SP.
 * Limites são instantes canônicos (meia-noite SP dos dias de início/fim) —
 * mesma identidade usada nas linhas persistidas de financial_periods.
 *
 * @param referenceDate Instante real (default: agora). Os campos SP são
 *   extraídos internamente — NÃO passar wall-clock deslocado.
 */
export function getCurrentFinancialPeriod(
  financialDayStart: number,
  financialDayEnd: number,
  referenceDate: Date = new Date()
): FinancialPeriod {
  const { year, month, day } = spParts(referenceDate);

  let startDate: Date;
  let endDate: Date;

  // Se o dia atual é maior ou igual ao dia de início, o período começou neste mês
  if (day >= financialDayStart) {
    startDate = spMidnightOf(year, month, financialDayStart);

    // Se o dia de fim é menor ou igual ao dia de início, vai para o próximo mês
    if (financialDayEnd <= financialDayStart) {
      endDate = spMidnightOf(year, month + 1, financialDayEnd);
    } else {
      endDate = spMidnightOf(year, month, financialDayEnd);
    }
  } else {
    // Se o dia atual é menor que o dia de início, o período começou no mês anterior
    startDate = spMidnightOf(year, month - 1, financialDayStart);

    if (financialDayEnd <= financialDayStart) {
      endDate = spMidnightOf(year, month, financialDayEnd);
    } else {
      endDate = spMidnightOf(year, month - 1, financialDayEnd);
    }
  }

  return { startDate, endDate };
}

/**
 * Período financeiro de um mês específico (month 1-12) no calendário SP.
 */
export function getFinancialPeriodForMonth(
  financialDayStart: number,
  financialDayEnd: number,
  year: number,
  month: number // 1-12
): FinancialPeriod {
  const monthIndex = month - 1;

  if (financialDayEnd <= financialDayStart) {
    return {
      startDate: spMidnightOf(year, monthIndex, financialDayStart),
      endDate: spMidnightOf(year, monthIndex + 1, financialDayEnd),
    };
  }

  return {
    startDate: spMidnightOf(year, monthIndex, financialDayStart),
    endDate: spMidnightOf(year, monthIndex, financialDayEnd),
  };
}

/**
 * Períodos anteriores (índice 0 = atual), retrocedendo mês a mês no calendário SP.
 * Usa dia 15 como âncora de referência para não sofrer overflow de fim de mês.
 */
export function getPreviousFinancialPeriods(
  financialDayStart: number,
  financialDayEnd: number,
  numberOfPeriods: number = 6,
  referenceDate: Date = new Date()
): FinancialPeriod[] {
  const { year, month } = spParts(referenceDate);
  const currentPeriod = getCurrentFinancialPeriod(
    financialDayStart,
    financialDayEnd,
    referenceDate
  );

  const periods: FinancialPeriod[] = [currentPeriod];

  for (let i = 1; i < numberOfPeriods; i++) {
    const anchor = spMidnightOf(year, month - i, 15);
    periods.push(getCurrentFinancialPeriod(financialDayStart, financialDayEnd, anchor));
  }

  return periods;
}

/**
 * Label do período em português (ex.: "Julho 2026", "Julho - Agosto 2026").
 */
export function formatPeriodLabel(startDate: Date, endDate: Date): string {
  const startMonth = formatInTimeZone(startDate, SAO_PAULO_TIMEZONE, 'MMMM', {
    locale: ptBR,
  });
  const endMonth = formatInTimeZone(endDate, SAO_PAULO_TIMEZONE, 'MMMM', {
    locale: ptBR,
  });
  const startYear = Number(formatInTimeZone(startDate, SAO_PAULO_TIMEZONE, 'yyyy'));
  const endYear = Number(formatInTimeZone(endDate, SAO_PAULO_TIMEZONE, 'yyyy'));

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

  return label
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
