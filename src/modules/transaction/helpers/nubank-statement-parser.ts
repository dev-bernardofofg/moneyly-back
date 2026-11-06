import { spMidnight } from '@core/helpers/dates';
import type { OfxStatement, OfxTransaction } from './ofx-parser';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const LONG_MONTHS = [
  'JANEIRO',
  'FEVEREIRO',
  'MARCO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

const MONEY = '\\d{1,3}(?:\\.\\d{3})*,\\d{2}';
const PERIOD =
  /(\d{1,2}) DE (\p{L}+) DE (\d{4})\s+(\d{1,2}) DE (\p{L}+) DE (\d{4})\s+VALORES EM R\$/iu;
const HEADER_ACCOUNT = /^•.*\sConta$/;
const ACCOUNT_NUMBER = /^\d+-\d+$/;
const DAY_TOTAL = new RegExp(
  `^(\\d{1,2}) (${MONTHS.join('|')}) (\\d{4}) Total de (entradas \\+|saídas -) ${MONEY}$`,
  'i'
);
const SECTION_TOTAL = new RegExp(`^Total de (entradas \\+|saídas -) ${MONEY}$`, 'i');
const INLINE_ENTRY = new RegExp(`^(.+?)\\s+(${MONEY})$`);
const AMOUNT_ONLY = new RegExp(`^(${MONEY})$`);
const PAGINATION = /^--\s*\d+\s+\S+\s+\d+\s*--$/;
const FOOTER_START = /^[^\d,.]*\?(?:\s|$)|^Extrato\b.*\bdia\b/;
const MAX_TITLE = 80;
// Nome, documento, número da conta e período: se o período não casar, não engole o resto.
const HEADER_LINES = 4;

const toCents = (value: string) => Number(value.replace(/\D/g, ''));
const stripAccents = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '');
const isoDay = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// Documento mascarado, agência e conta quebram de linha no PDF; por isso toleram espaço no meio.
const cleanTitle = (parts: string[]) =>
  parts
    .join(' ')
    .replace(/•{3}\.\s*\d+\.\s*\d+\s*-\s*••/g, '')
    .replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '')
    .replace(/Ag[êe]ncia:\s*\d+/gi, '')
    .replace(/Conta:\s*(?:\d+\s*-\s*\d+|\d+)?/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/(?:\s-)+(?=\s-|\s*$)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TITLE)
    .trim();

/**
 * Texto extraído do extrato de conta em PDF do Nubank. Lançamentos ficam depois de
 * "Movimentações", sob um dia ("5 OUT 2026 Total de entradas + ...") e uma seção
 * (entradas ou saídas) que continua valendo nas páginas seguintes. Lançamento é "Título valor"
 * em uma linha, ou várias linhas de texto fechadas por uma linha só com o valor.
 */
export function parseNubankStatement(text: string): OfxStatement | null {
  if (!/Movimentações/.test(text) || !/Total de entradas/.test(text)) return null;
  const lines = text.split(/\r?\n/).map((line) => line.trim());

  const headerIndex = lines.findIndex((line) => HEADER_ACCOUNT.test(line));
  const number = headerIndex >= 0 ? lines[headerIndex + 1] : undefined;
  if (!number || !ACCOUNT_NUMBER.test(number)) return null;
  const accountKey = `nubank:conta:${number}`;

  const period = text.match(PERIOD);
  let periodEnd: Date | null = null;
  if (period) {
    const month = LONG_MONTHS.indexOf(stripAccents(period[5]!).toUpperCase());
    if (month < 0) return null;
    periodEnd = spMidnight(isoDay(Number(period[6]), month, Number(period[4])));
  }

  const transactions: OfxTransaction[] = [];
  const occurrences = new Map<string, number>();
  let started = false;
  let headerLines = 0;
  let inFooter = false;
  let date: Date | null = null;
  let type: 'income' | 'expense' | null = null;
  let pending: string[] = [];

  const push = (parts: string[], value: string) => {
    const title = cleanTitle(parts);
    const amount = toCents(value);
    pending = [];
    if (!date || !type || !title || amount === 0) return;

    // Sem id no PDF: o saldo ou a posição mudariam entre extratos sobrepostos.
    const key = `${date.toISOString().slice(0, 10)}:${type}:${amount}:${title.toLowerCase()}`;
    const order = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, order);
    transactions.push({
      externalId: `nubank-pdf:${accountKey}:${key}:${order}`.slice(0, 200),
      type,
      amount,
      date,
      title,
    });
  };

  for (const line of lines) {
    if (!started) {
      started = line === 'Movimentações';
      continue;
    }
    if (PAGINATION.test(line)) {
      inFooter = false;
      headerLines = HEADER_LINES;
      pending = [];
      continue;
    }
    if (headerLines > 0) {
      headerLines = PERIOD.test(line) ? 0 : headerLines - 1;
      continue;
    }
    if (inFooter) continue;
    if (FOOTER_START.test(line)) {
      inFooter = true;
      pending = [];
      continue;
    }
    if (!line) continue;

    const day = line.match(DAY_TOTAL);
    if (day) {
      const month = MONTHS.indexOf(day[2]!.toUpperCase());
      date = spMidnight(isoDay(Number(day[3]), month, Number(day[1])));
      type = day[4]!.toLowerCase().startsWith('entradas') ? 'income' : 'expense';
      pending = [];
      continue;
    }
    const section = line.match(SECTION_TOTAL);
    if (section) {
      type = section[1]!.toLowerCase().startsWith('entradas') ? 'income' : 'expense';
      pending = [];
      continue;
    }

    const amountOnly = line.match(AMOUNT_ONLY);
    if (amountOnly) {
      push(pending, amountOnly[1]!);
      continue;
    }
    const inline = line.match(INLINE_ENTRY);
    if (inline) {
      push([...pending, inline[1]!], inline[2]!);
      continue;
    }
    // Resto de "Conta: 123-4" que a quebra de página deixou sozinho.
    if (!ACCOUNT_NUMBER.test(line)) pending.push(line);
  }

  const through =
    periodEnd ??
    (transactions.length > 0
      ? new Date(Math.max(...transactions.map((row) => row.date.getTime())))
      : null);
  if (!through) return null;
  return { accountKey, through, transactions };
}
