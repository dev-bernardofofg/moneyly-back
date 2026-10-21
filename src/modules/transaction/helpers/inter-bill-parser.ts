import { spMidnight, spMidnightOf } from '@core/helpers/dates';
import type { OfxStatement, OfxTransaction } from './ofx-parser';

export interface BillStatement extends OfxStatement {
  dueDate: Date;
  total: number | null;
}

const MONTHS: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};

const ENTRY_START =
  /^(\d{2}) de (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.? (\d{4})\s+(.*)$/i;
const AMOUNT_END = /(\+\s*)?R\$\s*([\d.]+,\d{2})\s*$/;
const DUE_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
// Detalhe do Pix parcelado: só repete valores que já estão no total da linha.
const INSTALLMENT_BREAKDOWN = /Principal \(R\$ [\d.,]+\) \+ Juros \(R\$ [\d.,]+\)/;
// Quebra de página ou fim da tabela no meio de um lançamento: descarta o pedaço.
const BREAKS = /^(-- \d+ of \d+ --|Total CARTÃO|CARTÃO \d{4}|Data\s+Movimentação)/;

const toCents = (value: string) => Number(value.replace(/\D/g, ''));

/**
 * Texto extraído da fatura em PDF do Inter. Cada lançamento começa com "01 de set. 2026" e
 * termina na linha com o valor ("R$ 8,00"; crédito vem com "+"). Colunas separadas por tab;
 * "-" é beneficiário vazio. O Pix parcelado ocupa três linhas.
 */
export function parseInterBill(text: string): BillStatement | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim());

  const dueIndex = lines.findIndex((line) => line === 'Data de Vencimento');
  const dueMatch = dueIndex >= 0 ? lines[dueIndex + 1]?.match(DUE_DATE) : null;
  if (!dueMatch) return null;
  const dueDate = spMidnightOf(Number(dueMatch[3]), Number(dueMatch[2]) - 1, Number(dueMatch[1]));

  const transactions: OfxTransaction[] = [];
  const occurrences = new Map<string, number>();
  let pending: { date: Date; parts: string[] } | null = null;

  const finish = (entry: { date: Date; parts: string[] }) => {
    const joined = entry.parts.join('\t');
    const amountMatch = joined.match(AMOUNT_END)!;
    const title = joined
      .slice(0, amountMatch.index)
      .replace(INSTALLMENT_BREAKDOWN, '')
      .split('\t')
      .map((column) => column.trim())
      .filter((column) => column && column !== '-')
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, 100);
    const amount = toCents(amountMatch[2]!);
    if (!title || amount === 0) return;

    // Sem id no PDF: dia + valor + título + ordem, estável ao reimportar a mesma fatura.
    const key = `${entry.date.toISOString().slice(0, 10)}:${amount}:${title}`;
    const order = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, order);
    transactions.push({
      externalId: `inter-pdf:${key}:${order}`.slice(0, 200),
      type: amountMatch[1] ? 'income' : 'expense',
      amount,
      date: entry.date,
      title,
    });
  };

  for (const line of lines) {
    const start = line.match(ENTRY_START);
    if (start) {
      const [, day, month, year, rest] = start;
      pending = {
        date: spMidnight(
          `${year}-${String(MONTHS[month!.toLowerCase()]! + 1).padStart(2, '0')}-${day}`
        ),
        parts: [rest!],
      };
    } else if (pending && BREAKS.test(line)) {
      pending = null;
      continue;
    } else if (pending && line) {
      pending.parts.push(line);
    } else {
      continue;
    }

    if (AMOUNT_END.test(pending.parts.join('\t'))) {
      finish(pending);
      pending = null;
    }
  }

  if (transactions.length === 0) return null;
  const card = text.match(/CARTÃO \d{4}\*{4}(\d{4})/);
  const totalIndex = lines.findIndex((line) => line === 'Total da sua fatura');
  const totalMatch = totalIndex >= 0 ? lines[totalIndex + 1]?.match(AMOUNT_END) : null;
  return {
    accountKey: `inter:${card?.[1] ?? 'pdf'}`,
    dueDate,
    total: totalMatch ? toCents(totalMatch[2]!) : null,
    transactions,
  };
}
