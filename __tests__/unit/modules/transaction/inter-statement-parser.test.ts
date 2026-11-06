import { spMidnight } from '@core/helpers/dates';
import { isBillPayment } from '@modules/transaction/helpers/import-category-suggester';
import { parseInterBill } from '@modules/transaction/helpers/inter-bill-parser';
import { parseInterStatement } from '@modules/transaction/helpers/inter-statement-parser';

const T = '\t';

// Forma do texto extraído do extrato de conta do Inter, com dados inventados.
const build = (extra: string[] = []) =>
  [
    'Extrato gerado em: 06/11/2026 - 10h00',
    'FULANO DE TAL',
    'CPF/CNPJ: 000.000.000-00, Instituição: Banco Inter, Agência: 0001-9, Conta: 1234567-8',
    'Período: 01/10/2026 a 05/11/2026',
    'Saldo total',
    'R$ 100,00',
    `Valor ${T} Saldo por transação ${T} 3 de Outubro de 2026 Saldo do dia: R$ 1.500,00`,
    `Pix enviado: "Cp :00000000-Padaria Central  "  ${T} -R$ 8,50  ${T} R$ 1.491,50`,
    `Pix recebido: "Cp :00000000-Fulano Cliente"  ${T} R$ 1.200,00  ${T} R$ 2.691,50`,
    `Pix enviado: "Cp :00000000-Padaria Central  "  ${T} -R$ 8,50  ${T} R$ 2.683,00`,
    `Pix enviado: "Cp :00000000-Padaria Central  "  ${T} -R$ 8,50  ${T} R$ 2.674,50`,
    '5 de Outubro de 2026 Saldo do dia: R$ 10,00',
    `Pix enviado: "Cp :00000000-Loja do Zé"  ${T} -R$ 20,00  ${T} R$ 10,00`,
    'Página 1 de 2',
    '-- 1 of 2 --',
    '4 de Novembro de 2026 Saldo do dia: -R$ 30,00',
    `Pagamento efetuado: "Pagamento fatura Cartão Inter"  ${T} -R$ 1.000,00  ${T} -R$ 30,00`,
    ...extra,
  ].join('\n');

describe('parseInterStatement', () => {
  const statement = parseInterStatement(build())!;

  it('reads the account key and the printed period end as through', () => {
    expect(statement.accountKey).toBe('inter:conta:1234567-8');
    expect(statement.through).toEqual(spMidnight('2026-11-05'));
  });

  it('is not a bill: it carries no due date', () => {
    expect(statement).not.toHaveProperty('dueDate');
  });

  it('keeps the entry value, takes the sign from the first value and ignores the balance', () => {
    expect(
      statement.transactions.map((t) => [t.title, t.type, t.amount, t.date.toISOString()])
    ).toEqual([
      [
        'Pix enviado: Cp :00000000-Padaria Central',
        'expense',
        850,
        spMidnight('2026-10-03').toISOString(),
      ],
      [
        'Pix recebido: Cp :00000000-Fulano Cliente',
        'income',
        120000,
        spMidnight('2026-10-03').toISOString(),
      ],
      [
        'Pix enviado: Cp :00000000-Padaria Central',
        'expense',
        850,
        spMidnight('2026-10-03').toISOString(),
      ],
      [
        'Pix enviado: Cp :00000000-Padaria Central',
        'expense',
        850,
        spMidnight('2026-10-03').toISOString(),
      ],
      [
        'Pix enviado: Cp :00000000-Loja do Zé',
        'expense',
        2000,
        spMidnight('2026-10-05').toISOString(),
      ],
      [
        'Pagamento efetuado: Pagamento fatura Cartão Inter',
        'expense',
        100000,
        spMidnight('2026-11-04').toISOString(),
      ],
    ]);
  });

  it('reads the day glued to the column header and a negative day balance', () => {
    expect(statement.transactions[0]!.date).toEqual(spMidnight('2026-10-03'));
    expect(statement.transactions.at(-1)!.date).toEqual(spMidnight('2026-11-04'));
  });

  it('gives distinct, balance-independent ids to identical lines', () => {
    const ids = statement.transactions.map((t) => t.externalId);
    expect(new Set(ids).size).toBe(ids.length);
    const shifted = parseInterStatement(
      build()
        .replace(/R\$ 1\.491,50/, 'R$ 7,00')
        .replace('Saldo do dia: R$ 1.500,00', 'Saldo do dia: R$ 9,00')
    )!;
    expect(shifted.transactions.map((t) => t.externalId)).toEqual(ids);
  });

  it('gives the same ids to overlapping statements of the same account', () => {
    const later = parseInterStatement(
      build().replace('Período: 01/10/2026 a 05/11/2026', 'Período: 04/10/2026 a 08/11/2026')
    )!;
    expect(later.transactions.map((t) => t.externalId)).toEqual(
      statement.transactions.map((t) => t.externalId)
    );
  });

  it('falls back to the latest entry date when the period is missing', () => {
    const noPeriod = parseInterStatement(build().replace(/Período:.*\n/, ''))!;
    expect(noPeriod.through).toEqual(spMidnight('2026-11-04'));
  });

  it('returns an empty list for a valid period without entries', () => {
    const empty = parseInterStatement(
      [
        'Banco Inter, Conta: 1234567-8',
        'Período: 01/10/2026 a 05/11/2026',
        'Saldo do dia: R$ 0,00',
      ].join('\n')
    )!;
    expect(empty.transactions).toEqual([]);
    expect(empty.through).toEqual(spMidnight('2026-11-05'));
  });

  it('ignores footer and pagination lines', () => {
    expect(statement.transactions).toHaveLength(6);
  });

  it('refuses text that is not an Inter statement', () => {
    expect(parseInterStatement('Nubank\nMovimentações')).toBeNull();
    expect(parseInterStatement(build().replace('Banco Inter', 'Outro'))).toBeNull();
    expect(parseInterStatement(build().replace('Conta: 1234567-8', ''))).toBeNull();
    expect(
      parseInterStatement(build().replace('Outubro de 2026 Saldo', 'Foo de 2026 Saldo'))
    ).toBeNull();
  });

  it('is not mistaken for a bill, nor the other way around', () => {
    expect(parseInterBill(build())).toBeNull();
  });

  it('marks the card bill payment as a bill_payment on a checking account', () => {
    const payment = statement.transactions.at(-1)!;
    expect(isBillPayment(payment.title, payment.type, 'checking')).toBe(true);
  });
});
