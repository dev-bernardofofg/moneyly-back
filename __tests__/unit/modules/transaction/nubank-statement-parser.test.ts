import { spMidnight } from '@core/helpers/dates';
import { isBillPayment } from '@modules/transaction/helpers/import-category-suggester';
import { parseNubankBill } from '@modules/transaction/helpers/nubank-bill-parser';
import { parseNubankStatement } from '@modules/transaction/helpers/nubank-statement-parser';

const T = '\t';

const header = [
  'Fulano de Tal',
  `•••.123.456-•• 0001 ${T} Agência Conta`,
  '98765-4',
  `a ${T} 1 DE OUTUBRO DE 2026 31 DE OUTUBRO DE 2026 VALORES EM R$`,
];
const footer = [
  'Dúvidas? Fale com a gente no app (24h por dia',
  'e 7 dias) ou ligue 0000 000 0000.',
  'Extrato gerado no dia 6 de novembro de 2026 às 10:00 1 de 3',
  '-- 1 of 3 --',
];

// Forma do texto extraído do extrato do Nubank, com dados inventados.
const build = (yieldValue = '+0,00') =>
  [
    ...header,
    'Saldo final do período',
    'R$ 10,00',
    'Saldo inicial',
    'Rendimento líquido',
    'Total de entradas',
    'Total de saídas',
    'Saldo final do período',
    '10,00',
    yieldValue,
    '+1.300,00',
    '-1.300,00',
    '10,00',
    'Movimentações',
    '2 OUT 2026 Total de entradas + 1.300,00',
    'Resgate RDB 100,00',
    'Transferência recebida pelo Pix FULANO CLIENTE',
    '- •••.111.222-•• - BANCO INTER (0077)',
    'Agência: 1 Conta: 5555-5',
    '1.200,00',
    'Total de saídas - 258,50',
    'Transferência enviada pelo Pix PADARIA CENTRAL LTDA',
    '12.345.678/0001-90 - BANCO X (0001) Agência: 1 Conta: 1234-',
    '5',
    '8,50',
    ...footer,
    ...header,
    'Pagamento de fatura 200,00',
    'Aplicação RDB 50,00',
    '3 OUT 2026 Total de entradas + 500,00',
    'Resgate RDB 500,00',
    'Total de saídas - 100,00',
    'Pagamento de boleto efetuado 100,00',
    ...footer.slice(0, 3),
  ].join('\n');

describe('parseNubankStatement', () => {
  const statement = parseNubankStatement(build())!;

  it('reads the account key and the printed period end as through', () => {
    expect(statement.accountKey).toBe('nubank:conta:98765-4');
    expect(statement.through).toEqual(spMidnight('2026-10-31'));
  });

  it('is not a bill: it carries no due date', () => {
    expect(statement).not.toHaveProperty('dueDate');
  });

  it('takes type from the section, across lines, days and page breaks', () => {
    expect(statement.transactions.map((t) => [t.title, t.type, t.amount])).toEqual([
      ['Resgate RDB', 'income', 10000],
      ['Transferência recebida pelo Pix FULANO CLIENTE - BANCO INTER (0077)', 'income', 120000],
      ['Transferência enviada pelo Pix PADARIA CENTRAL LTDA - BANCO X (0001)', 'expense', 850],
      ['Pagamento de fatura', 'expense', 20000],
      ['Aplicação RDB', 'expense', 5000],
      ['Resgate RDB', 'income', 50000],
      ['Pagamento de boleto efetuado', 'expense', 10000],
    ]);
  });

  it('dates entries by the day line, keeping the date across the page break', () => {
    const days = statement.transactions.map((t) => t.date.getTime());
    const oct2 = spMidnight('2026-10-02').getTime();
    const oct3 = spMidnight('2026-10-03').getTime();
    expect(days).toEqual([oct2, oct2, oct2, oct2, oct2, oct3, oct3]);
  });

  it('keeps summary, header and footer lines out of the entries', () => {
    const titles = statement.transactions.map((t) => t.title).join('|');
    expect(titles).not.toMatch(/Saldo|Dúvidas|Extrato|Fulano de Tal|VALORES/);
  });

  it('caps long titles at 80 characters without document, agency or account', () => {
    const long = build().replace('PADARIA CENTRAL LTDA', 'X'.repeat(120));
    const title = parseNubankStatement(long)!.transactions[2]!.title;
    expect(title).toHaveLength(80);
    expect(title).not.toMatch(/Conta|Agência|\d{2}\.\d{3}\.\d{3}/);
  });

  it('gives distinct, stable ids and repeats with an index', () => {
    const repeated = parseNubankStatement(
      build().replace('Resgate RDB 100,00', 'Resgate RDB 100,00\nResgate RDB 100,00')
    )!;
    const ids = repeated.transactions.map((t) => t.externalId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toMatch(/:1$/);
    expect(ids[1]).toMatch(/:2$/);
    expect(statement.transactions[0]!.externalId).toBe(ids[0]);
  });

  it('gives the same ids to overlapping statements of the same account', () => {
    const later = parseNubankStatement(
      build().replace(/31 DE OUTUBRO DE 2026 VALORES/g, '30 DE NOVEMBRO DE 2026 VALORES')
    )!;
    expect(later.transactions.map((t) => t.externalId)).toEqual(
      statement.transactions.map((t) => t.externalId)
    );
  });

  it('falls back to the latest entry date when the period is missing', () => {
    const noPeriod = parseNubankStatement(build().replace(/VALORES EM R\$/g, ''))!;
    expect(noPeriod.through).toEqual(spMidnight('2026-10-03'));
  });

  it('returns an empty list for a valid period without entries', () => {
    const empty = parseNubankStatement(
      [...header, 'Total de entradas', 'Movimentações', ...footer].join('\n')
    )!;
    expect(empty.transactions).toEqual([]);
    expect(empty.through).toEqual(spMidnight('2026-10-31'));
  });

  it('refuses text that is not a Nubank statement', () => {
    expect(parseNubankStatement('Banco Inter\nSaldo do dia:')).toBeNull();
    expect(parseNubankStatement(build().replace('Movimentações', 'Outra coisa'))).toBeNull();
    expect(parseNubankStatement(build().replace('98765-4', 'sem conta'))).toBeNull();
    expect(parseNubankBill(build())).toBeNull();
  });

  describe('account yield', () => {
    it('adds one income row at the period end when the summary yield is positive', () => {
      const withYield = parseNubankStatement(build('+12,34'))!;
      expect(withYield.transactions).toHaveLength(8);
      expect(withYield.transactions.at(-1)).toMatchObject({
        title: 'Rendimento da conta',
        type: 'income',
        amount: 1234,
        date: spMidnight('2026-10-31'),
        externalId: 'nubank:conta:98765-4:rendimento:2026-10-31',
      });
    });

    it('does not shift the ids of the other rows', () => {
      const withYield = parseNubankStatement(build('+12,34'))!;
      expect(withYield.transactions.slice(0, 7).map((t) => t.externalId)).toEqual(
        statement.transactions.map((t) => t.externalId)
      );
    });

    it('adds nothing for zero or missing yield', () => {
      expect(statement.transactions).toHaveLength(7);
      const missing = build().replace('Rendimento líquido', 'Outro rótulo');
      expect(parseNubankStatement(missing)!.transactions).toHaveLength(7);
    });
  });

  it('refuses a statement whose Movimentações line is never found alone', () => {
    const text = build().replace('Movimentações', 'Movimentações do mês');
    expect(parseNubankStatement(text)).toBeNull();
  });

  it('strips a CNPJ broken around its separators', () => {
    const broken = build().replace('12.345.678/0001-90', '12.345.678/\n0001-90');
    expect(parseNubankStatement(broken)!.transactions[2]!.title).toBe(
      'Transferência enviada pelo Pix PADARIA CENTRAL LTDA - BANCO X (0001)'
    );
  });

  it('keeps a title that ends in a number', () => {
    const text = build()
      .replace('Resgate RDB 100,00', 'Compra Parcela 2 12,50')
      .replace('Aplicação RDB 50,00', 'Mercado Central\nCompra Parcela 2\n50,00');
    const titles = parseNubankStatement(text)!.transactions.map((t) => [t.title, t.amount]);
    expect(titles).toContainEqual(['Compra Parcela 2', 1250]);
    expect(titles).toContainEqual(['Mercado Central Compra Parcela 2', 5000]);
  });

  it('marks its bill payment as a bill_payment on a checking account', () => {
    const payment = statement.transactions[3]!;
    expect(isBillPayment(payment.title, payment.type, 'checking')).toBe(true);
  });
});
