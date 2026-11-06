import { spMidnight } from '@core/helpers/dates';
import type { BillStatement } from './inter-bill-parser';
import type { OfxTransaction } from './ofx-parser';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MONTH = MONTHS.join('|');

const DUE_DATE = new RegExp(`Data de vencimento:\\s*(\\d{1,2}) (${MONTH}) (\\d{4})`, 'i');
const TOTAL = /^Total a pagar R\$\s*([\d.]+,\d{2})\s*$/;
const SECTION = /^TRANSAÇÕES DE\b/;
// Sem "R$" ao fim não é lançamento: "9 OUT Saldo em ..." é detalhe de encargos.
const ENTRY = new RegExp(
  `^(\\d{1,2}) (${MONTH}) (?:•+ \\d{4} )?(.*?)\\s+([−-])?R\\$\\s*([\\d.]+,\\d{2})$`,
  'i'
);

const toCents = (value: string) => Number(value.replace(/\D/g, ''));

/**
 * Texto extraído da fatura em PDF do Nubank. Lançamento = "07 OUT •••• 1234 Título R$ 8,50",
 * crédito vem como "−R$ 8,50". Só vale o que está depois de "TRANSAÇÕES DE": o resumo e os
 * avisos de encargos repetem valores que já estão nos lançamentos.
 */
export function parseNubankBill(text: string): BillStatement | null {
  if (!/Nubank/i.test(text)) return null;
  const lines = text.split(/\r?\n/).map((line) => line.trim());

  const dueMatch = text.match(DUE_DATE);
  if (!dueMatch || !lines.some((line) => SECTION.test(line))) return null;
  const dueMonth = MONTHS.indexOf(dueMatch[2]!.toUpperCase());
  const dueYear = Number(dueMatch[3]);
  const dueDate = spMidnight(
    `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${dueMatch[1]!.padStart(2, '0')}`
  );

  const accountKey = 'nubank:fatura';
  const transactions: OfxTransaction[] = [];
  const occurrences = new Map<string, number>();
  let inSection = false;

  for (const line of lines) {
    if (SECTION.test(line)) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    const match = line.match(ENTRY);
    if (!match) continue;

    const [, day, monthName, rawTitle, sign, value] = match;
    const title = rawTitle!.replace(/\s+/g, ' ').trim().slice(0, 100);
    const amount = toCents(value!);
    if (!title || amount === 0) continue;

    const month = MONTHS.indexOf(monthName!.toUpperCase());
    // Lançamento não traz ano: mês posterior ao do vencimento é do ano anterior.
    const year = month > dueMonth ? dueYear - 1 : dueYear;
    const date = spMidnight(
      `${year}-${String(month + 1).padStart(2, '0')}-${day!.padStart(2, '0')}`
    );

    // Sem id no PDF: dia + valor + título + ordem, estável ao reimportar a mesma fatura.
    const key = `${date.toISOString().slice(0, 10)}:${amount}:${title}`;
    const order = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, order);
    transactions.push({
      externalId: `nubank-pdf:${accountKey}:${key}:${order}`.slice(0, 200),
      type: sign ? 'income' : 'expense',
      amount,
      date,
      title,
    });
  }

  if (transactions.length === 0) return null;
  const totalMatch = lines.map((line) => line.match(TOTAL)).find(Boolean);
  return {
    accountKey,
    through: new Date(Math.max(...transactions.map((row) => row.date.getTime()))),
    dueDate,
    total: totalMatch ? toCents(totalMatch[1]!) : null,
    transactions,
  };
}
