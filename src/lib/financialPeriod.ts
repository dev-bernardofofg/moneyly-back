/**
 * Utilitários para calcular períodos financeiros personalizados
 */

export interface FinancialPeriod {
  startDate: Date;
  endDate: Date;
}

/**
 * Calcula o período financeiro atual baseado na configuração do usuário
 * @param financialMonthStart Dia do mês que inicia o período (1-31)
 * @param financialMonthEnd Dia do mês que termina o período (1-31)
 * @param referenceDate Data de referência (padrão: hoje)
 * @returns Objeto com data de início e fim do período financeiro
 */
export function getCurrentFinancialPeriod(
  financialMonthStart: number,
  financialMonthEnd: number,
  referenceDate: Date = new Date()
): FinancialPeriod {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-11
  const currentDay = referenceDate.getDate();

  let startDate: Date;
  let endDate: Date;

  // Se o dia atual é maior ou igual ao dia de início, o período começou neste mês
  if (currentDay >= financialMonthStart) {
    startDate = new Date(currentYear, currentMonth, financialMonthStart);

    // Se o dia de fim é menor que o dia de início, vai para o próximo mês
    if (financialMonthEnd < financialMonthStart) {
      endDate = new Date(currentYear, currentMonth + 1, financialMonthEnd);
    } else {
      endDate = new Date(currentYear, currentMonth, financialMonthEnd);
    }
  } else {
    // Se o dia atual é menor que o dia de início, o período começou no mês anterior
    startDate = new Date(currentYear, currentMonth - 1, financialMonthStart);

    // Se o dia de fim é menor que o dia de início, vai para este mês
    if (financialMonthEnd < financialMonthStart) {
      endDate = new Date(currentYear, currentMonth, financialMonthEnd);
    } else {
      endDate = new Date(currentYear, currentMonth - 1, financialMonthEnd);
    }
  }

  return { startDate, endDate };
}

/**
 * Calcula o período financeiro para um mês específico
 * @param financialMonthStart Dia do mês que inicia o período (1-31)
 * @param financialMonthEnd Dia do mês que termina o período (1-31)
 * @param year Ano desejado
 * @param month Mês desejado (1-12)
 * @returns Objeto com data de início e fim do período financeiro
 */
export function getFinancialPeriodForMonth(
  financialMonthStart: number,
  financialMonthEnd: number,
  year: number,
  month: number // 1-12
): FinancialPeriod {
  const monthIndex = month - 1; // Converter para 0-11

  let startDate: Date;
  let endDate: Date;

  // Se o dia de fim é menor que o dia de início, o período cruza meses
  if (financialMonthEnd < financialMonthStart) {
    startDate = new Date(year, monthIndex, financialMonthStart);
    endDate = new Date(year, monthIndex + 1, financialMonthEnd);
  } else {
    startDate = new Date(year, monthIndex, financialMonthStart);
    endDate = new Date(year, monthIndex, financialMonthEnd);
  }

  return { startDate, endDate };
}

/**
 * Verifica se uma data está dentro do período financeiro atual
 * @param date Data a ser verificada
 * @param financialMonthStart Dia do mês que inicia o período (1-31)
 * @param financialMonthEnd Dia do mês que termina o período (1-31)
 * @param referenceDate Data de referência (padrão: hoje)
 * @returns true se a data está no período financeiro atual
 */
export function isDateInCurrentFinancialPeriod(
  date: Date,
  financialMonthStart: number,
  financialMonthEnd: number,
  referenceDate: Date = new Date()
): boolean {
  const period = getCurrentFinancialPeriod(
    financialMonthStart,
    financialMonthEnd,
    referenceDate
  );

  return date >= period.startDate && date <= period.endDate;
}

/**
 * Gera uma descrição legível do período financeiro
 * @param financialMonthStart Dia do mês que inicia o período (1-31)
 * @param financialMonthEnd Dia do mês que termina o período (1-31)
 * @returns String descritiva do período
 */
export function getFinancialPeriodDescription(
  financialMonthStart: number,
  financialMonthEnd: number
): string {
  if (financialMonthStart === financialMonthEnd) {
    return `Dia ${financialMonthStart} de cada mês`;
  }

  if (financialMonthEnd < financialMonthStart) {
    return `Dia ${financialMonthStart} a ${financialMonthEnd} do próximo mês`;
  }

  return `Dia ${financialMonthStart} a ${financialMonthEnd} do mesmo mês`;
}
