import { spMidnight } from '@core/helpers/dates';
import { parseNubankBill } from '@modules/transaction/helpers/nubank-bill-parser';
import { isBillPayment } from '@modules/transaction/helpers/import-category-suggester';

const ADJUSTMENT_TITLE = 'Encargos e saldos da fatura Nubank';

// Forma do texto extraído da fatura do Nubank, com dados inventados.
const build = (total: string | null) =>
  [
    'Fulano de Tal',
    'Nu Pagamentos S.A. - Nubank',
    'Data de vencimento: 7 NOV 2026',
    'RESUMO DA FATURA ATUAL',
    'Pagamento recebido −R$ 100,00',
    ...(total ? [`Total a pagar R$ ${total}`] : []),
    '03 OUT Compra no resumo que não pode entrar R$ 1,00',
    'TRANSAÇÕES DE 8 SET A 7 OUT',
    '28 DEZ •••• 1234 Loja Antiga - Parcela 2/3 R$ 300,00',
    '30 SET •••• 1234 Padaria Central R$ 8,50',
    '30 SET •••• 1234 Padaria Central R$ 8,50',
    '05 OUT •••• 5678 Estorno Loja −R$ 20,00',
    '02 JUN Pagamento da Fatura - Parcela 3/6',
    'Total a pagar: R$ 50,00. Parcelado em 6 vezes de R$ 9,00.',
    '9,00. Valor do IOF: R$ 1,00.',
    '-- 2 de 4 --',
    'FATURA 7 NOV 2026 EMISSÃO E ENVIO 7 OUT 2026',
    'TRANSAÇÕES DE 8 SET A 7 OUT',
    'R$ 70,00',
    '06 OUT Pagamento em 06 OUT −R$ 100,00',
    '06 OUT Saldo em atraso',
    '• Saldo em atraso de R$ 40,00. Valor do IOF R$ 1,00.',
    'R$ 40,00',
    '06 OUT Juros de atraso R$ 3,00',
    '06 OUT Encerramento de dívida −R$ 15,00',
  ].join('\n');

// compras: 300,00 + 8,50 + 8,50 − 20,00 + 70,00 = 367,00
describe('parseNubankBill', () => {
  const bill = parseNubankBill(build('400,00'))!;

  it('reads due date, total and account key', () => {
    expect(bill.dueDate).toEqual(spMidnight('2026-11-07'));
    expect(bill.total).toBe(40000);
    expect(bill.accountKey).toBe('nubank:fatura');
  });

  it('keeps purchases and the payment, and ignores debt rows and notes with R$', () => {
    expect(bill.transactions.map((t) => [t.title, t.type, t.amount])).toEqual([
      ['Loja Antiga - Parcela 2/3', 'expense', 30000],
      ['Padaria Central', 'expense', 850],
      ['Padaria Central', 'expense', 850],
      ['Estorno Loja', 'income', 2000],
      ['Pagamento da Fatura - Parcela 3/6', 'expense', 7000],
      ['Pagamento em 06 OUT', 'income', 10000],
      [ADJUSTMENT_TITLE, 'expense', 3300],
    ]);
  });

  it('infers the year from the due date and uses the latest entry date as through', () => {
    expect(bill.transactions[0]!.date).toEqual(spMidnight('2025-12-28'));
    expect(bill.transactions[1]!.date).toEqual(spMidnight('2026-09-30'));
    expect(bill.through).toEqual(spMidnight('2026-10-06'));
    expect(bill.transactions.at(-1)!.date).toEqual(bill.through);
  });

  it('adds a negative adjustment as income', () => {
    const adjusted = parseNubankBill(build('300,00'))!.transactions.at(-1)!;
    expect(adjusted).toMatchObject({ type: 'income', amount: 6700, title: ADJUSTMENT_TITLE });
  });

  it('adds no adjustment when the total matches or is missing', () => {
    const titles = (total: string | null) =>
      parseNubankBill(build(total))!.transactions.map((t) => t.title);
    expect(titles('367,00')).not.toContain(ADJUSTMENT_TITLE);
    expect(titles(null)).not.toContain(ADJUSTMENT_TITLE);
    expect(parseNubankBill(build(null))!.total).toBeNull();
  });

  it('gives stable, distinct ids across re-parses', () => {
    const again = parseNubankBill(build('400,00'))!;
    const ids = bill.transactions.map((t) => t.externalId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(again.transactions.map((t) => t.externalId)).toEqual(ids);
    expect(ids.at(-1)).toBe('nubank:fatura:2026-11-07:ajuste');
  });

  it('accepts an ASCII hyphen as the credit sign', () => {
    const text =
      'Nubank\nData de vencimento: 7 NOV 2026\nTRANSAÇÕES DE 8 SET A 7 OUT\n06 OUT •••• 1234 Estorno -R$ 5,00';
    expect(parseNubankBill(text)!.transactions[0]).toMatchObject({ type: 'income', amount: 500 });
  });

  it('refuses text that is not a Nubank bill', () => {
    expect(parseNubankBill('Data de Vencimento\n07/10/2026')).toBeNull();
    expect(parseNubankBill(build('1,00').replace(/TRANSAÇÕES DE/g, 'MOVIMENTOS'))).toBeNull();
    expect(parseNubankBill(build('1,00').replace(/Nubank/g, 'Outro'))).toBeNull();
  });

  it('marks its payment lines as card bill payments', () => {
    expect(isBillPayment('Pagamento em 06 OUT', 'income', 'credit_card')).toBe(true);
    expect(isBillPayment('Pagamento recebido', 'income', 'credit_card')).toBe(true);
    expect(isBillPayment('Crédito de estorno', 'income', 'credit_card')).toBe(false);
  });
});
