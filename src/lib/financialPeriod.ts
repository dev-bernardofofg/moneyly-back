/**
 * Utilitários para calcular períodos financeiros personalizados
 */

export interface FinancialPeriod {
  startDate: Date;
  endDate: Date;
}

/**
 * Calcula o período financeiro atual baseado na configuração do usuário
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @param referenceDate Data de referência (padrão: hoje)
 * @returns Objeto com data de início e fim do período financeiro
 */
export function getCurrentFinancialPeriod(
  financialDayStart: number,
  financialDayEnd: number,
  referenceDate: Date = new Date()
): FinancialPeriod {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-11
  const currentDay = referenceDate.getDate();

  let startDate: Date;
  let endDate: Date;

  // Se o dia atual é maior ou igual ao dia de início, o período começou neste mês
  if (currentDay >= financialDayStart) {
    startDate = new Date(currentYear, currentMonth, financialDayStart);

    // Se o dia de fim é menor ou igual ao dia de início, vai para o próximo mês
    if (financialDayEnd <= financialDayStart) {
      endDate = new Date(currentYear, currentMonth + 1, financialDayEnd);
    } else {
      endDate = new Date(currentYear, currentMonth, financialDayEnd);
    }
  } else {
    // Se o dia atual é menor que o dia de início, o período começou no mês anterior
    startDate = new Date(currentYear, currentMonth - 1, financialDayStart);

    // Se o dia de fim é menor ou igual ao dia de início, vai para este mês
    if (financialDayEnd <= financialDayStart) {
      endDate = new Date(currentYear, currentMonth, financialDayEnd);
    } else {
      endDate = new Date(currentYear, currentMonth - 1, financialDayEnd);
    }
  }

  return { startDate, endDate };
}

/**
 * Calcula o período financeiro para um mês específico
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
    startDate = new Date(year, monthIndex, financialDayStart);
    endDate = new Date(year, monthIndex + 1, financialDayEnd);
  } else {
    startDate = new Date(year, monthIndex, financialDayStart);
    endDate = new Date(year, monthIndex, financialDayEnd);
  }

  return { startDate, endDate };
}

/**
 * Verifica se uma data está dentro do período financeiro atual
 * @param date Data a ser verificada
 * @param financialDayStart Dia do mês que inicia o período (1-31)
 * @param financialDayEnd Dia do mês que termina o período (1-31)
 * @param referenceDate Data de referência (padrão: hoje)
 * @returns true se a data está no período financeiro atual
 */
export function isDateInCurrentFinancialPeriod(
  date: Date,
  financialDayStart: number,
  financialDayEnd: number,
  referenceDate: Date = new Date()
): boolean {
  const period = getCurrentFinancialPeriod(
    financialDayStart,
    financialDayEnd,
    referenceDate
  );

  return date >= period.startDate && date <= period.endDate;
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
