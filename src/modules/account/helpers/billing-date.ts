import { spMidnightOf, spParts } from '@core/helpers/dates';
import type { Account } from '@infra/db/schema';

/**
 * Vencimento da fatura que recebe uma compra. Compra no dia do fechamento ou depois cai
 * na fatura seguinte; vencimento com dia <= fechamento vence no mês após o fechamento.
 * Dia além do fim do mês vira o último dia (spMidnightOf).
 */
export function invoiceDueDate(purchase: Date, closingDay: number, dueDay: number): Date {
  const { year, month, day } = spParts(purchase);
  const closingMonth = day < closingDay ? month : month + 1;
  const dueMonth = dueDay > closingDay ? closingMonth : closingMonth + 1;
  return spMidnightOf(year, dueMonth, dueDay);
}

/** Data que define o período financeiro: vencimento da fatura no cartão, a própria data na conta. */
export function billingDateFor(
  account: Pick<Account, 'type' | 'closingDay' | 'dueDay'>,
  date: Date
): Date {
  if (account.type === 'credit_card' && account.closingDay && account.dueDay) {
    return invoiceDueDate(date, account.closingDay, account.dueDay);
  }
  return date;
}

/** Vencimento do cartão que cai no período (período mensal tem um). */
export function dueDateInPeriod(dueDay: number, start: Date, end: Date): Date | null {
  const { year, month } = spParts(start);
  for (const offset of [0, 1]) {
    const due = spMidnightOf(year, month + offset, dueDay);
    if (due.getTime() >= start.getTime() && due.getTime() <= end.getTime()) return due;
  }
  return null;
}

/** Vencimento mais próximo da data: é a fatura que um pagamento nesse dia quita. */
export function nearestDueDate(dueDay: number, date: Date): Date {
  const { year, month } = spParts(date);
  return [-1, 0, 1]
    .map((offset) => spMidnightOf(year, month + offset, dueDay))
    .reduce((best, due) =>
      Math.abs(due.getTime() - date.getTime()) < Math.abs(best.getTime() - date.getTime())
        ? due
        : best
    );
}

/** Próximo vencimento a partir do dia (inclusive). */
export function nextDueDate(dueDay: number, from: Date): Date {
  const { year, month } = spParts(from);
  const thisMonth = spMidnightOf(year, month, dueDay);
  return thisMonth.getTime() >= from.getTime() ? thisMonth : spMidnightOf(year, month + 1, dueDay);
}
