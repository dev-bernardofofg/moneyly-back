import { spMidnight } from '@core/helpers/dates';

export interface OfxTransaction {
  externalId: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  title: string;
}

export interface OfxStatement {
  accountKey: string;
  transactions: OfxTransaction[];
}

// OFX 1.x (SGML) dos bancos brasileiros não fecha tags folha (<TRNAMT>-10.00), e o 2.x
// (XML) fecha. Ler o valor até o próximo "<" ou quebra de linha cobre os dois.
const readTag = (block: string, tag: string): string | undefined => {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'));
  const value = match?.[1]
    ?.trim()
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  return value ? value : undefined;
};

// DTPOSTED: YYYYMMDD[HHMMSS[.XXX]][[-3:BRT]] — só o dia importa (contrato: meia-noite SP).
const parseOfxDate = (raw: string): Date | undefined => {
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return undefined;
  return spMidnight(`${match[1]}-${match[2]}-${match[3]}`);
};

// Alguns bancos exportam "1.234,56" ou "-12,34".
const parseOfxAmount = (raw: string): number => {
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  return Number(normalized);
};

// Bancos brasileiros exportam em UTF-8 ou em windows-1252 (CHARSET:1252) sem padrão;
// UTF-8 estrito falha nos bytes de acento do 1252, e aí o 1252 é o certo.
export function decodeOfxFile(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function parseOfx(content: string): OfxStatement {
  if (!/<OFX>/i.test(content)) throw new Error('Arquivo não é um extrato OFX');

  const bankId = readTag(content, 'BANKID') ?? 'card';
  const accountId = readTag(content, 'ACCTID') ?? 'unknown';
  const accountKey = `${bankId}:${accountId}`;

  const blocks = content.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? [];
  const transactions: OfxTransaction[] = [];

  for (const block of blocks) {
    const fitId = readTag(block, 'FITID');
    const rawDate = readTag(block, 'DTPOSTED');
    const rawAmount = readTag(block, 'TRNAMT');
    const title = readTag(block, 'MEMO') ?? readTag(block, 'NAME');
    if (!fitId || !rawDate || !rawAmount || !title) continue;

    const date = parseOfxDate(rawDate);
    const amount = parseOfxAmount(rawAmount);
    if (!date || !Number.isFinite(amount) || amount === 0) continue;

    transactions.push({
      externalId: `${accountKey}:${fitId}`,
      type: amount < 0 ? 'expense' : 'income',
      // OFX traz reais com ponto; a API trabalha em centavos.
      amount: Math.round(Math.abs(amount) * 100),
      date,
      title: title.slice(0, 100),
    });
  }

  return { accountKey, transactions };
}
