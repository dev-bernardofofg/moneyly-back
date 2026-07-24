import { spMidnightOf, spParts } from '@core/helpers/dates';
import type { RecurringFrequency } from '../recurring-transaction.types';

/**
 * Próxima execução a partir de `from`, no calendário SP. Retorna meia-noite SP.
 * monthly sem dayOfMonth: âncora = dia SP de `from`, clampado ao fim do mês
 * (31/jan → 28/fev; não pula mês). Para âncora fixa, persistir dayOfMonth.
 */
export function calculateNextExecution(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null,
  from: Date = new Date()
): Date {
  const { year, month, day, weekday } = spParts(from);

  switch (frequency) {
    case 'daily':
      return spMidnightOf(year, month, day + 1);

    case 'weekly': {
      const target = dayOfWeek ?? weekday;
      const daysUntil = (target - weekday + 7) % 7 || 7;
      return spMidnightOf(year, month, day + daysUntil);
    }

    case 'monthly': {
      const anchor = dayOfMonth ?? day;
      return spMidnightOf(year, month + 1, anchor);
    }

    case 'yearly':
      return spMidnightOf(year + 1, month, day);
  }
}

/** Primeira execução futura a partir de agora (calendário SP). */
export function calculateFirstExecution(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const now = new Date();
  const { year, month, day } = spParts(now);

  switch (frequency) {
    case 'daily':
      return spMidnightOf(year, month, day + 1);

    case 'weekly':
      return calculateNextExecution('weekly', null, dayOfWeek ?? null, now);

    case 'monthly': {
      if (dayOfMonth) {
        // Próximo dia D: neste mês se ainda não passou, senão no seguinte.
        const targetMonth = day >= dayOfMonth ? month + 1 : month;
        return spMidnightOf(year, targetMonth, dayOfMonth);
      }
      return calculateNextExecution('monthly', null, null, now);
    }

    case 'yearly':
      return spMidnightOf(year + 1, month, day);
  }
}
