import { spMidnight } from '@core/helpers/dates';
import { parseNubankBill } from '@modules/transaction/helpers/nubank-bill-parser';
import { isBillPayment } from '@modules/transaction/helpers/import-category-suggester';

// Forma do texto extraído da fatura do Nubank, com dados inventados.
const BILL = [
  'Fulano de Tal',
  'Nu Pagamentos S.A. - Nubank',
  'Olá, Fulano. Esta é a sua fatura de novembro',
  'Data de vencimento: 7 NOV 2026',
  'Período vigente: 8 SET a 7 OUT',
  'RESUMO DA FATURA ATUAL',
  'Fatura anterior R$ 100,00',
  'Pagamento recebido −R$ 100,00',
  'Total a pagar R$ 1.234,56',
  '03 OUT Compra no resumo que não pode entrar R$ 1,00',
  'TRANSAÇÕES DE 8 SET A 7 OUT',
  '28 DEZ •••• 1234 Loja Antiga - Parcela 2/3 R$ 300,00',
  '30 SET •••• 1234 Padaria Central R$ 8,50',
  '30 SET •••• 1234 Padaria Central R$ 8,50',
  '05 OUT •••• 5678 Mercado Livre - Parcela 1/2 R$ 1.200,00',
  'Pagamentos',
  '06 OUT Pagamento em 06 OUT −R$ 100,00',
  '06 OUT Saldo em atraso',
  '06 OUT Crédito de estorno −R$ 12,34',
  '• Valor da operação: R$ 12,34',
  '-- 2 de 4 --',
  'FATURA 7 NOV 2026 EMISSÃO E ENVIO 7 OUT 2026',
  'TRANSAÇÕES DE 8 SET A 7 OUT',
  '07 OUT IOF de atraso R$ 0,00',
  '07 OUT Juros de mora R$ 2,00',
].join('\n');

describe('parseNubankBill', () => {
  const bill = parseNubankBill(BILL)!;

  it('reads due date, total and account key', () => {
    expect(bill.dueDate).toEqual(spMidnight('2026-11-07'));
    expect(bill.total).toBe(123456);
    expect(bill.accountKey).toBe('nubank:fatura');
  });

  it('reads only entry lines inside the transactions section', () => {
    expect(bill.transactions.map((t) => [t.title, t.type, t.amount])).toEqual([
      ['Loja Antiga - Parcela 2/3', 'expense', 30000],
      ['Padaria Central', 'expense', 850],
      ['Padaria Central', 'expense', 850],
      ['Mercado Livre - Parcela 1/2', 'expense', 120000],
      ['Pagamento em 06 OUT', 'income', 10000],
      ['Crédito de estorno', 'income', 1234],
      ['Juros de mora', 'expense', 200],
    ]);
  });

  it('infers the year from the due date, going back when the month is later', () => {
    expect(bill.transactions[0]!.date).toEqual(spMidnight('2025-12-28'));
    expect(bill.transactions[1]!.date).toEqual(spMidnight('2026-09-30'));
    expect(bill.through).toEqual(spMidnight('2026-10-07'));
  });

  it('gives stable, distinct ids to repeated lines', () => {
    const again = parseNubankBill(BILL)!;
    const ids = bill.transactions.map((t) => t.externalId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(again.transactions.map((t) => t.externalId)).toEqual(ids);
  });

  it('accepts an ASCII hyphen as the credit sign', () => {
    const text =
      'Nubank\nData de vencimento: 7 NOV 2026\nTRANSAÇÕES DE 8 SET A 7 OUT\n06 OUT Estorno -R$ 5,00';
    expect(parseNubankBill(text)!.transactions[0]).toMatchObject({ type: 'income', amount: 500 });
  });

  it('returns a null total when the bill does not print one', () => {
    const text =
      'Nubank\nData de vencimento: 7 NOV 2026\nTRANSAÇÕES DE 8 SET A 7 OUT\n06 OUT Loja R$ 5,00';
    expect(parseNubankBill(text)!.total).toBeNull();
  });

  it('refuses text that is not a Nubank bill', () => {
    expect(parseNubankBill('Data de Vencimento\n07/10/2026')).toBeNull();
    expect(parseNubankBill(BILL.replace(/TRANSAÇÕES DE/g, 'MOVIMENTOS'))).toBeNull();
    expect(parseNubankBill(BILL.replace(/Nubank/g, 'Outro'))).toBeNull();
  });

  it('marks its payment lines as card bill payments', () => {
    expect(isBillPayment('Pagamento em 06 OUT', 'income', 'credit_card')).toBe(true);
    expect(isBillPayment('Pagamento recebido', 'income', 'credit_card')).toBe(true);
    expect(isBillPayment('Crédito de estorno', 'income', 'credit_card')).toBe(false);
  });
});
