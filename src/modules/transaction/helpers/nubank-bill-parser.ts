import { spDayString, spMidnight } from '@core/helpers/dates';
import type { BillStatement } from './inter-bill-parser';
import type { OfxTransaction } from './ofx-parser';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MONTH = MONTHS.join('|');

const DUE_DATE = new RegExp(`Data de vencimento:\\s*(\\d{1,2}) (${MONTH}) (\\d{4})`, 'i');
const TOTAL = /^Total a pagar R\$\s*([\d.]+,\d{2})\s*$/;
const SECTION = /^TRANSAÇÕES DE\b/;
const ENTRY_START = new RegExp(`^(\\d{1,2}) (${MONTH})\\b\\s*(.*)$`, 'i');
// Valor no fim da linha do lançamento; "R$" no meio de nota de encargos nunca conta.
const INLINE_AMOUNT = /^(.*?)\s*(?:^|\s)([−-])?R\$\s*([\d.]+,\d{2})$/;
// Lançamento de várias linhas: o valor vem sozinho numa linha, depois das notas.
const STANDALONE_AMOUNT = /^([−-])?R\$\s*([\d.]+,\d{2})$/;
const CARD_MARK = /^•+ \d{4}\s*/;
const INSTALLMENT = /Parcela \d+\/\d+/i;
const PAYMENT = /^Pagamento em\b/i;

const toCents = (value: string) => Number(value.replace(/\D/g, ''));

interface Entry {
  date: Date;
  title: string;
  card: boolean;
  negative: boolean;
  amount: number;
}

/**
 * Texto extraído da fatura em PDF do Nubank. Só vale o que está depois de "TRANSAÇÕES DE".
 * Lançamento começa em "07 OUT" e o valor ("R$ 8,50", crédito "−R$ 8,50") está no fim da
 * mesma linha ou sozinho numa linha adiante; notas de encargos citam "R$" no texto.
 * Viram transação só compras (com "•••• 1234" ou "Parcela N/M") e o pagamento da fatura;
 * saldos, juros, multa e IOF de dívida são contabilidade do banco e entram no ajuste único
 * que fecha a soma com o total da fatura.
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

  const entries: Entry[] = [];
  let inSection = false;
  let pending: Omit<Entry, 'negative' | 'amount'> | null = null;

  const push = (negative: boolean, value: string) => {
    if (!pending) return;
    entries.push({ ...pending, negative, amount: toCents(value) });
    pending = null;
  };

  for (const line of lines) {
    if (SECTION.test(line)) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;

    const start = line.match(ENTRY_START);
    if (start) {
      const [, day, monthName, rest] = start;
      const month = MONTHS.indexOf(monthName!.toUpperCase());
      // Lançamento não traz ano: mês posterior ao do vencimento é do ano anterior.
      const year = month > dueMonth ? dueYear - 1 : dueYear;
      const date = spMidnight(
        `${year}-${String(month + 1).padStart(2, '0')}-${day!.padStart(2, '0')}`
      );
      const inline = rest!.match(INLINE_AMOUNT);
      const head = (inline ? inline[1]! : rest!).trim();
      pending = {
        date,
        card: CARD_MARK.test(head),
        title: head.replace(CARD_MARK, '').replace(/\s+/g, ' ').trim().slice(0, 100),
      };
      if (inline) push(Boolean(inline[2]), inline[3]!);
      continue;
    }

    const standalone = pending && line.match(STANDALONE_AMOUNT);
    if (standalone) push(Boolean(standalone[1]), standalone[2]!);
  }

  const occurrences = new Map<string, number>();
  const accountKey = 'nubank:fatura';
  const transactions: OfxTransaction[] = [];
  let purchases = 0;
  for (const entry of entries) {
    if (entry.amount === 0 || !entry.title) continue;
    const isPurchase = entry.card || INSTALLMENT.test(entry.title);
    const isPayment = !isPurchase && entry.negative && PAYMENT.test(entry.title);
    if (!isPurchase && !isPayment) continue;
    if (isPurchase) purchases += entry.negative ? -entry.amount : entry.amount;

    // Sem id no PDF: dia + valor + título + ordem, estável ao reimportar a mesma fatura.
    const key = `${entry.date.toISOString().slice(0, 10)}:${entry.amount}:${entry.title}`;
    const order = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, order);
    transactions.push({
      externalId: `nubank-pdf:${accountKey}:${key}:${order}`.slice(0, 200),
      type: entry.negative ? 'income' : 'expense',
      amount: entry.amount,
      date: entry.date,
      title: entry.title,
    });
  }

  if (entries.length === 0) return null;
  const through = new Date(Math.max(...entries.map((entry) => entry.date.getTime())));
  const totalMatch = lines.map((line) => line.match(TOTAL)).find(Boolean);
  const total = totalMatch ? toCents(totalMatch[1]!) : null;

  // O total já desconta o pagamento, por isso ele fica fora desta soma.
  const adjustment = total === null ? 0 : total - purchases;
  if (adjustment !== 0) {
    transactions.push({
      externalId: `nubank:fatura:${spDayString(dueDate)}:ajuste`,
      type: adjustment < 0 ? 'income' : 'expense',
      amount: Math.abs(adjustment),
      date: through,
      title: 'Encargos e saldos da fatura Nubank',
    });
  }

  if (transactions.length === 0) return null;
  return { accountKey, through, dueDate, total, transactions };
}
