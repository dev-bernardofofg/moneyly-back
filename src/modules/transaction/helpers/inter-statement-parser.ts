import { spMidnight } from '@core/helpers/dates';
import type { OfxStatement, OfxTransaction } from './ofx-parser';

const MONTHS = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const DAY_HEADER = /(\d{1,2}) de (\p{L}+) de (\d{4}) Saldo do dia:/u;
const ACCOUNT = /Conta:\s*(\d+-\d+)/;
const PERIOD = /Período:\s*\d{2}\/\d{2}\/\d{4} a (\d{2})\/(\d{2})\/(\d{4})/;
// Primeiro valor é o lançamento (com "-" quando sai); o último é o saldo e não interessa.
const ENTRY = /^(.+?):\s*"(.*)"\s+(-)?R\$\s*([\d.]+,\d{2})\s+-?R\$\s*[\d.]+,\d{2}\s*$/;

const toCents = (value: string) => Number(value.replace(/\D/g, ''));
const monthIndex = (name: string) =>
  MONTHS.indexOf(name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
const isoDay = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/**
 * Texto extraído do extrato de conta em PDF do Inter. Cada dia abre com "5 de Outubro de 2026
 * Saldo do dia: R$ 1,00" (às vezes grudado no cabeçalho "Valor / Saldo"), e cada lançamento é
 * `Tipo: "descrição"` seguido de lançamento e saldo, separados por tab.
 */
export function parseInterStatement(text: string): OfxStatement | null {
  if (!/Banco Inter/i.test(text) || !/Saldo do dia:/.test(text)) return null;
  const lines = text.split(/\r?\n/).map((line) => line.trim());

  const account = text.match(ACCOUNT);
  if (!account) return null;
  const accountKey = `inter:conta:${account[1]}`;

  const periodEnd = text.match(PERIOD);
  const transactions: OfxTransaction[] = [];
  const occurrences = new Map<string, number>();
  let date: Date | null = null;

  for (const line of lines) {
    const day = line.match(DAY_HEADER);
    if (day) {
      const month = monthIndex(day[2]!);
      if (month < 0) return null;
      date = spMidnight(isoDay(Number(day[3]), month, Number(day[1])));
    }

    const entry = line.match(ENTRY);
    if (!entry || !date) continue;
    const title = `${entry[1]}: ${entry[2]}`.replace(/\s+/g, ' ').trim().slice(0, 100);
    const amount = toCents(entry[4]!);
    if (amount === 0) continue;
    const type = entry[3] ? 'expense' : 'income';

    // Sem id no PDF: o saldo do dia ou a posição mudariam entre extratos sobrepostos.
    const key = `${date.toISOString().slice(0, 10)}:${type}:${amount}:${title.toLowerCase()}`;
    const order = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, order);
    transactions.push({
      externalId: `inter-pdf:${accountKey}:${key}:${order}`.slice(0, 200),
      type,
      amount,
      date,
      title,
    });
  }

  const through = periodEnd
    ? spMidnight(isoDay(Number(periodEnd[3]), Number(periodEnd[2]) - 1, Number(periodEnd[1])))
    : transactions.length > 0
      ? new Date(Math.max(...transactions.map((row) => row.date.getTime())))
      : undefined;
  if (!through) return null;
  return { accountKey, through, transactions };
}
