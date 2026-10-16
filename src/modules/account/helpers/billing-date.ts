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
