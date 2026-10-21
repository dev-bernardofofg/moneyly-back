/**
 * Integration tests for card bill payment status (manual + detected on import)
 */

import request from 'supertest';
import { app } from '../../src/server';

const ofx = (rows: Array<{ fitId: string; date: string; amount: string; memo: string }>) => `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKTRANLIST>
${rows
  .map(
    (row) =>
      `<STMTTRN>\n<TRNTYPE>OTHER\n<DTPOSTED>${row.date}\n<TRNAMT>${row.amount}\n<FITID>${row.fitId}\n<MEMO>${row.memo}`
  )
  .join('\n')}
</BANKTRANLIST>
</OFX>`;

type PreviewItem = { type: 'income' | 'expense'; amount: number; date: string; status: string };

describe('Card bill payments', () => {
  let token: string;
  let categoryId: string;
  let checkingId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const createCard = async (name: string) =>
    (
      await request(app)
        .post('/accounts')
        .set(auth())
        .send({ type: 'credit_card', name, closingDay: 25, dueDay: 5 })
        .expect(201)
    ).body.data.id as string;

  // Compra em 10/09 num cartão que fecha 25 e vence 5 → fatura de 05/10.
  const purchase = (accountId: string, amount: number) =>
    request(app)
      .post('/transactions/create')
      .set(auth())
      .send({
        type: 'expense',
        title: 'Compra',
        amount,
        category: categoryId,
        date: '2026-09-10',
        accountId,
      })
      .expect(201);

  const billOf = async (accountId: string, periodId: string) => {
    const res = await request(app)
      .get('/overview/card-bills')
      .set(auth())
      .query({ periodId })
      .expect(200);
    return res.body.data.bills.find((bill: { accountId: string }) => bill.accountId === accountId);
  };

  const importBillPayments = async (accountId: string, content: string) => {
    const preview = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file: Buffer.from(content, 'utf8').toString('base64url') })
      .expect(200);
    const billPayments = (preview.body.data.items as PreviewItem[])
      .filter((item) => item.status === 'bill_payment')
      .map(({ type, amount, date }) => ({ type, amount, date }));
    const res = await request(app)
      .post('/transactions/import')
      .set(auth())
      .send({ accountId, items: [], billPayments })
      .expect(201);
    return res.body.data.billsPaid as number;
  };

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({ name: 'Bills', email: `bills-paid${Date.now()}@test.com`, password: 'password123' });
    token = res.body.data.accessToken;
    const category = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Bills ${Date.now()}` });
    categoryId = category.body.data.id;
    checkingId = (await request(app).get('/accounts').set(auth())).body.data[0].id;
  });

  it('marks a bill as paid and back to pending by hand', async () => {
    const cardId = await createCard('Cartão Manual');
    const { periodId } = (await purchase(cardId, 5000)).body.data;

    const pending = await billOf(cardId, periodId);
    expect(pending.dueDate.slice(0, 10)).toBe('2026-10-05');
    expect(pending.payment).toBeNull();

    await request(app)
      .post(`/accounts/${cardId}/bill-payment`)
      .set(auth())
      .send({ dueDate: '2026-10-05' })
      .expect(200);
    expect((await billOf(cardId, periodId)).payment).toMatchObject({ source: 'manual' });

    await request(app)
      .delete(`/accounts/${cardId}/bill-payment/2026-10-05`)
      .set(auth())
      .expect(200);
    expect((await billOf(cardId, periodId)).payment).toBeNull();
  });

  it('rejects a bill payment on a checking account', async () => {
    await request(app)
      .post(`/accounts/${checkingId}/bill-payment`)
      .set(auth())
      .send({ dueDate: '2026-10-05' })
      .expect(400);
  });

  it('detects the payment on the card statement', async () => {
    const cardId = await createCard('Cartão Extrato');
    const { periodId } = (await purchase(cardId, 3000)).body.data;

    const billsPaid = await importBillPayments(
      cardId,
      ofx([{ fitId: 'p1', date: '20261004', amount: '30.00', memo: 'PAGAMENTO ON LINE' }])
    );

    expect(billsPaid).toBe(1);
    expect((await billOf(cardId, periodId)).payment).toMatchObject({ source: 'import' });
  });

  it('does not mark the bill paid by a partial or advance payment', async () => {
    const cardId = await createCard('Cartão Parcial');
    const { periodId } = (await purchase(cardId, 8000)).body.data;

    const billsPaid = await importBillPayments(
      cardId,
      ofx([{ fitId: 'p3', date: '20261001', amount: '20.00', memo: 'PAGAMENTO ON LINE' }])
    );

    expect(billsPaid).toBe(0);
    expect((await billOf(cardId, periodId)).payment).toBeNull();
  });

  it('detects the payment on the checking statement by the bill amount', async () => {
    const cardId = await createCard('Cartão Valor');
    const { periodId } = (await purchase(cardId, 12345)).body.data;

    const billsPaid = await importBillPayments(
      checkingId,
      ofx([{ fitId: 'p2', date: '20261005', amount: '-123.45', memo: 'PAGAMENTO FATURA CARTAO' }])
    );

    expect(billsPaid).toBe(1);
    expect((await billOf(cardId, periodId)).payment).toMatchObject({ source: 'import' });
  });
});

describe('Card credit limit', () => {
  let token: string;
  let categoryId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({ name: 'Limit', email: `card-limit${Date.now()}@test.com`, password: 'password123' });
    token = res.body.data.accessToken;
    const category = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Limit ${Date.now()}` });
    categoryId = category.body.data.id;
  });

  it('counts unpaid bills still to come against the limit', async () => {
    const card = await request(app)
      .post('/accounts')
      .set(auth())
      .send({
        type: 'credit_card',
        name: 'Cartão Limite',
        closingDay: 28,
        dueDay: 10,
        creditLimit: 100000,
      })
      .expect(201);
    const cardId = card.body.data.id as string;
    expect(card.body.data.creditLimit).toBe(100000);

    // Compra de hoje vai para uma fatura que ainda vai vencer.
    const spend = (amount: number) =>
      request(app)
        .post('/transactions/create')
        .set(auth())
        .send({ type: 'expense', title: 'Compra', amount, category: categoryId, accountId: cardId })
        .expect(201);
    await spend(20000);
    const { periodId } = (await spend(5000)).body.data;

    const billOf = async () =>
      (
        await request(app).get('/overview/card-bills').set(auth()).query({ periodId }).expect(200)
      ).body.data.bills.find((bill: { accountId: string }) => bill.accountId === cardId);

    const bill = await billOf();
    expect(bill.limit).toEqual({ total: 100000, used: 25000, available: 75000 });

    await request(app)
      .post(`/accounts/${cardId}/bill-payment`)
      .set(auth())
      .send({ dueDate: new Date(bill.dueDate).toISOString().slice(0, 10) })
      .expect(200);
    expect((await billOf()).limit).toEqual({ total: 100000, used: 0, available: 100000 });
  });

  it('rejects a limit on a checking account', async () => {
    const accounts = await request(app).get('/accounts').set(auth()).expect(200);
    await request(app)
      .put(`/accounts/${accounts.body.data[0].id}`)
      .set(auth())
      .send({ creditLimit: 1000 })
      .expect(400);
  });
});
