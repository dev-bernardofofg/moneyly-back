/**
 * Integration tests for importing an Inter card bill in PDF (text extraction mocked)
 */

import request from 'supertest';
import { app } from '../../src/server';

// pdfjs carrega o worker como ESM, o que o Jest (CJS) não executa; o parser tem teste próprio.
jest.mock('../../src/modules/transaction/helpers/pdf-text', () => ({
  ...jest.requireActual('../../src/modules/transaction/helpers/pdf-text'),
  extractPdfText: jest
    .fn()
    .mockResolvedValue(
      [
        'Total da sua fatura',
        'R$ 140,79',
        'Data de Vencimento',
        '07/10/2026',
        'CARTÃO 5555****1111',
        '04 de set. 2026 PAGAMENTO ON LINE \t- \t+ R$ 500,00',
        '10 de set. 2026 PADARIA CENTRAL \t- \tR$ 63,00',
        '15 de jul. 2026 LOJA XYZ (Parcela 03 de 04) \t- \tR$ 77,79',
        'Total CARTÃO 5555****1111 \tR$ 140,79',
      ].join('\n')
    ),
}));

type PreviewItem = {
  externalId: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  title: string;
  status: string;
};

describe('Card bill PDF import', () => {
  let token: string;
  let categoryId: string;
  let cardId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const file = Buffer.from('%PDF-1.7 fatura', 'latin1').toString('base64url');

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({ name: 'Pdf', email: `bill-pdf${Date.now()}@test.com`, password: 'password123' });
    token = res.body.data.accessToken;
    const category = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Pdf ${Date.now()}` });
    categoryId = category.body.data.id;
    cardId = (
      await request(app)
        .post('/accounts')
        .set(auth())
        .send({ type: 'credit_card', name: 'Cartão Inter', closingDay: 30, dueDay: 7 })
        .expect(201)
    ).body.data.id;
  });

  it('puts every row of the bill in the period of its due date', async () => {
    const preview = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file, accountId: cardId })
      .expect(200);
    const { bill, items } = preview.body.data as {
      bill: { dueDate: string; total: number };
      items: PreviewItem[];
    };
    expect(bill).toMatchObject({ total: 14079 });
    expect(bill.dueDate.slice(0, 10)).toBe('2026-10-07');
    expect(items.map((item) => item.status)).toEqual(['bill_payment', 'new', 'new']);

    const purchases = items.filter((item) => item.status === 'new');
    const confirm = await request(app)
      .post('/transactions/import')
      .set(auth())
      .send({
        accountId: cardId,
        billDueDate: bill.dueDate,
        items: purchases.map(({ externalId, type, amount, date, title }) => ({
          externalId,
          type,
          amount,
          date,
          title,
          categoryId,
        })),
      })
      .expect(201);
    expect(confirm.body.data).toMatchObject({ created: 2 });

    const list = await request(app)
      .get('/transactions/')
      .set(auth())
      .query({ page: 1, limit: 10, accountId: cardId })
      .expect(200);
    const periods = new Set(list.body.data.map((row: { periodId: string }) => row.periodId));
    expect(periods.size).toBe(1);

    const bills = await request(app)
      .get('/overview/card-bills')
      .set(auth())
      .query({ periodId: [...periods][0] })
      .expect(200);
    expect(bills.body.data.bills[0]).toMatchObject({ total: bill.total });
  });

  it('confirms what is already in the app instead of duplicating it', async () => {
    const { extractPdfText } = jest.requireMock('../../src/modules/transaction/helpers/pdf-text');
    (extractPdfText as jest.Mock).mockResolvedValueOnce(
      [
        'Total da sua fatura',
        'R$ 105,00',
        'Data de Vencimento',
        '07/11/2026',
        'CARTÃO 5555****1111',
        '10 de out. 2026 CURSOR AI POWERED IDE \t- \tR$ 105,00',
      ].join('\n')
    );
    // Lançada à mão antes da fatura chegar, com valor estimado e outro dia.
    const manual = await request(app)
      .post('/transactions/create')
      .set(auth())
      .send({
        type: 'expense',
        title: 'Cursor',
        amount: 10500,
        category: categoryId,
        date: '2026-10-05',
        accountId: cardId,
      })
      .expect(201);

    const preview = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file, accountId: cardId })
      .expect(200);
    const [item] = preview.body.data.items as Array<PreviewItem & { duplicateOf: string }>;
    expect(item).toMatchObject({ status: 'possible_duplicate', duplicateOf: manual.body.data.id });

    const confirm = await request(app)
      .post('/transactions/import')
      .set(auth())
      .send({
        accountId: cardId,
        billDueDate: preview.body.data.bill.dueDate,
        items: [
          {
            externalId: item!.externalId,
            type: item!.type,
            amount: item!.amount,
            date: item!.date,
            title: item!.title,
            duplicateOf: item!.duplicateOf,
          },
        ],
      })
      .expect(201);
    expect(confirm.body.data).toMatchObject({ created: 0, linked: 1 });

    (extractPdfText as jest.Mock).mockResolvedValueOnce(
      [
        'Data de Vencimento',
        '07/11/2026',
        '10 de out. 2026 CURSOR AI POWERED IDE \t- \tR$ 105,00',
      ].join('\n')
    );
    const again = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file, accountId: cardId })
      .expect(200);
    expect(again.body.data.items[0].status).toBe('imported');
  });

  it('rejects a PDF that is not an Inter bill', async () => {
    const { extractPdfText } = jest.requireMock('../../src/modules/transaction/helpers/pdf-text');
    (extractPdfText as jest.Mock).mockResolvedValueOnce('Outro documento qualquer');

    await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file, accountId: cardId })
      .expect(400);
  });
});
