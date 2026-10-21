import { spMidnight } from '@core/helpers/dates';
import { parseInterBill } from '@modules/transaction/helpers/inter-bill-parser';

// Mesmo layout do texto extraído da fatura do Inter (colunas separadas por tab).
const BILL = [
  'Resumo da fatura',
  'Total da sua fatura',
  'R$ 1.996,22',
  'Data de Vencimento',
  '07/10/2026',
  '-- 1 of 3 --',
  'Despesas da fatura',
  'CARTÃO 5555****1111',
  'Data Movimentação Beneficiário Valor',
  '01 de set. 2026 PADARIA CENTRAL \t- \tR$ 8,00',
  '04 de set. 2026 PAGAMENTO ON LINE \t- \t+ R$ 3.822,00',
  '17 de set. 2026 PIX CRED A VISTA \tLOJA XYZ \tR$ 63,00',
  '21 de set. 2026 PIX CRED PARCELADO (Parcela 01 de 03)',
  'Principal (R$ 1.372,88) + Juros (R$ 404,55)',
  'FULANO DE TAL \tR$ 1.777,43',
  '',
  '-- 2 of 3 --',
  'NOME DO TITULAR',
  '5555****1111 07/10/2026 R$ 1.996,22',
  'CARTÃO 5555****1111',
  '21 de set. 2026 BOX CHINA \t- \tR$ 35,00',
  '21 de set. 2026 BOX CHINA \t- \tR$ 35,00',
  'Total CARTÃO 5555****1111 \tR$ 1.918,43',
  'CARTÃO 5555****2222',
  '15 de jul. 2026 MLP *KaBuM-KaBuM (Parcela 03 de 04) \t- \tR$ 77,79',
  'Total CARTÃO 5555****2222 \tR$ 77,79',
].join('\n');

describe('parseInterBill', () => {
  const bill = parseInterBill(BILL)!;

  it('reads the due date and the printed total', () => {
    expect(bill.dueDate).toEqual(spMidnight('2026-10-07'));
    expect(bill.total).toBe(199622);
    expect(bill.accountKey).toBe('inter:1111');
  });

  it('reads every row in cents, credits as income', () => {
    expect(bill.transactions.map(({ title, type, amount }) => [title, type, amount])).toEqual([
      ['PADARIA CENTRAL', 'expense', 800],
      ['PAGAMENTO ON LINE', 'income', 382200],
      ['PIX CRED A VISTA LOJA XYZ', 'expense', 6300],
      ['PIX CRED PARCELADO (Parcela 01 de 03) FULANO DE TAL', 'expense', 177743],
      ['BOX CHINA', 'expense', 3500],
      ['BOX CHINA', 'expense', 3500],
      ['MLP *KaBuM-KaBuM (Parcela 03 de 04)', 'expense', 7779],
    ]);
    const expenses = bill.transactions
      .filter((row) => row.type === 'expense')
      .reduce((total, row) => total + row.amount, 0);
    expect(expenses).toBe(bill.total);
  });

  it('keeps the purchase date and gives repeated rows distinct stable ids', () => {
    const [first, second] = bill.transactions.filter((row) => row.title === 'BOX CHINA');
    expect(first!.date).toEqual(spMidnight('2026-09-21'));
    expect(first!.externalId).not.toBe(second!.externalId);
    expect(parseInterBill(BILL)!.transactions.map((row) => row.externalId)).toEqual(
      bill.transactions.map((row) => row.externalId)
    );
  });

  it('returns null for text that is not an Inter bill', () => {
    expect(parseInterBill('Extrato qualquer\n01/09/2026 compra 10,00')).toBeNull();
  });
});
