/**
 * Pagamento de fatura sai do saldo da conta corrente sem virar despesa.
 * Dates are relative to today so the suite does not depend on the current month.
 */

import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { spDayString, spMidnightPlusDays, spParts } from '@core/helpers/dates';
import { db } from '@infra/db';
import { accounts, billPaymentOutflows, cardBillPayments, transactions } from '@infra/db/schema';
import { app } from '../../src/server';

const OPENING = 500000;
const PAYMENT = 150000;

const ofx = (
  rows: Array<{ fitId: string; date: string; amount: string; memo: string }>,
  acctId: string
) => `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKACCTFROM><BANKID>0077<ACCTID>${acctId}</BANKACCTFROM>
<BANKTRANLIST>
${rows
  .map(
    (row) =>
      `<STMTTRN>\n<TRNTYPE>OTHER\n<DTPOSTED>${row.date}\n<TRNAMT>${row.amount}\n<FITID>${row.fitId}\n<MEMO>${row.memo}`
  )
  .join('\n')}
</BANKTRANLIST>
</OFX>`;

type PreviewItem = {
  externalId: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  status: string;
};
type Preview = { accountKey: string; through: string; items: PreviewItem[] };

const toFile = (content: string) => Buffer.from(content, 'utf8').toString('base64url');

const dayAt = (offset: number) => {
  const { year, month, day } = spParts(new Date());
  return spMidnightPlusDays(year, month, day, offset);
};
const ymd = (offset: number) => spDayString(dayAt(offset)).replace(/-/g, '');

describe('Bill payment outflows', () => {
  let token: string;
  let userId: string;
  let checkingId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const preview = async (content: string, accountId = checkingId) =>
    (
      await request(app)
        .post('/transactions/import/preview')
        .set(auth())
        .send({ file: toFile(content), accountId })
        .expect(200)
    ).body.data as Preview;

  const billPaymentsOf = ({ items }: Preview) =>
    items
      .filter((item) => item.status === 'bill_payment')
      .map(({ externalId, type, amount, date }) => ({ externalId, type, amount, date }));

  const confirm = (
    data: Preview,
    billPayments: ReturnType<typeof billPaymentsOf>,
    accountId = checkingId
  ) =>
    request(app)
      .post('/transactions/import')
      .set(auth())
      .send({
        accountId,
        accountKey: data.accountKey,
        through: data.through,
        items: [],
        billPayments,
      })
      .expect(201);

  const importFile = async (content: string, accountId = checkingId) => {
    const data = await preview(content, accountId);
    const res = await confirm(data, billPaymentsOf(data), accountId);
    return res.body.data as { billsPaid: number };
  };

  const statement = (fitId: string, offset = -2) =>
    ofx(
      [{ fitId, date: ymd(offset), amount: '-1500.00', memo: 'PAGAMENTO FATURA CARTAO' }],
      `conta-${fitId}`
    );

  const balance = async () => {
    const res = await request(app).get('/accounts').set(auth()).expect(200);
    return res.body.data.find((row: { id: string }) => row.id === checkingId)
      .currentBalance as number;
  };

  const outflows = () =>
    db.select().from(billPaymentOutflows).where(eq(billPaymentOutflows.userId, userId));

  const createCard = async (name: string) =>
    (
      await request(app)
        .post('/accounts')
        .set(auth())
        .send({ type: 'credit_card', name, closingDay: 25, dueDay: 5 })
        .expect(201)
    ).body.data.id as string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({
        name: 'Outflows',
        email: `outflows-${Date.now()}@test.com`,
        password: 'password123',
      });
    token = res.body.data.accessToken;
    const list = await request(app).get('/accounts').set(auth()).expect(200);
    checkingId = list.body.data[0].id;
    userId = list.body.data[0].userId;
  });

  beforeEach(async () => {
    await db.delete(billPaymentOutflows).where(eq(billPaymentOutflows.userId, userId));
    await db.delete(cardBillPayments).where(eq(cardBillPayments.userId, userId));
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db
      .delete(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isDefault, false)));
    await db
      .update(accounts)
      .set({ openingBalance: OPENING, openingBalanceDate: dayAt(-10), dataThrough: null })
      .where(eq(accounts.id, checkingId));
  });

  it('takes the paid bill out of the balance even with no card', async () => {
    expect(await balance()).toBe(OPENING);

    await importFile(statement('o1'));

    expect(await balance()).toBe(OPENING - PAYMENT);
  });

  it('records account, amount, date and id of the statement line', async () => {
    const data = await preview(statement('o2'));
    await confirm(data, billPaymentsOf(data));

    expect(await outflows()).toEqual([
      expect.objectContaining({
        userId,
        accountId: checkingId,
        amount: PAYMENT,
        date: dayAt(-2),
        externalId: data.items[0]!.externalId,
      }),
    ]);
  });

  it('flags the line as imported when the file comes back and never takes it twice', async () => {
    const file = statement('o3');
    const first = await preview(file);
    const lines = billPaymentsOf(first);
    await confirm(first, lines);

    const second = await preview(file);
    expect(second.items.map((item) => item.status)).toEqual(['imported']);
    await confirm(second, billPaymentsOf(second));
    expect(await balance()).toBe(OPENING - PAYMENT);

    // Prévia antiga, aberta antes da primeira confirmação.
    await confirm(first, lines);
    expect(await balance()).toBe(OPENING - PAYMENT);
    expect(await outflows()).toHaveLength(1);
  });

  it('takes the money out when the single card is identified too', async () => {
    await createCard('Cartão Único');

    const { billsPaid } = await importFile(statement('o4'));

    expect(billsPaid).toBe(1);
    expect(await balance()).toBe(OPENING - PAYMENT);
  });

  it('takes the money out when no card among many can be identified', async () => {
    await createCard('Cartão A');
    await createCard('Cartão B');

    const { billsPaid } = await importFile(statement('o5'));

    expect(billsPaid).toBe(0);
    expect(await balance()).toBe(OPENING - PAYMENT);
  });

  it('only marks the bill on a card statement', async () => {
    const cardId = await createCard('Cartão Extrato');
    const file = ofx(
      [{ fitId: 'o6', date: ymd(-2), amount: '1500.00', memo: 'PAGAMENTO ON LINE' }],
      'cartao-o6'
    );

    const { billsPaid } = await importFile(file, cardId);

    expect(billsPaid).toBe(1);
    expect(await outflows()).toHaveLength(0);
    expect(await balance()).toBe(OPENING);
  });

  it('moves no money when a bill is marked by hand', async () => {
    const cardId = await createCard('Cartão Manual');

    await request(app)
      .post(`/accounts/${cardId}/bill-payment`)
      .set(auth())
      .send({ dueDate: spDayString(dayAt(-2)) })
      .expect(200);

    expect(await outflows()).toHaveLength(0);
    expect(await balance()).toBe(OPENING);
  });

  it('follows the balance cutoff: only what comes after its date counts', async () => {
    await importFile(statement('o7', -10));
    expect(await balance()).toBe(OPENING);

    await importFile(statement('o8', -9));
    expect(await balance()).toBe(OPENING - PAYMENT);
  });

  it('lowers the free balance without becoming an expense', async () => {
    const insightsBefore = await request(app).get('/overview/insights').set(auth()).expect(200);

    await importFile(statement('o9'));

    const forecast = await request(app).get('/overview/forecast').set(auth()).expect(200);
    expect(forecast.body.data.freeBalance.components.accountsBalance).toBe(OPENING - PAYMENT);

    const rows = await db.select().from(transactions).where(eq(transactions.userId, userId));
    expect(rows).toHaveLength(0);
    const insightsAfter = await request(app).get('/overview/insights').set(auth()).expect(200);
    expect(insightsAfter.body.data).toEqual(insightsBefore.body.data);
  });

  it('ignores a credit sent as a bill payment on a checking statement', async () => {
    const data = await preview(statement('o11'));
    const lines = billPaymentsOf(data).map((line) => ({ ...line, type: 'income' as const }));

    await confirm(data, lines);

    expect(await outflows()).toHaveLength(0);
    expect(await balance()).toBe(OPENING);
  });

  it('rejects a bill payment without the id of the statement line', async () => {
    const data = await preview(statement('o10'));
    const lines = billPaymentsOf(data).map(({ type, amount, date }) => ({ type, amount, date }));

    await request(app)
      .post('/transactions/import')
      .set(auth())
      .send({
        accountId: checkingId,
        accountKey: data.accountKey,
        through: data.through,
        items: [],
        billPayments: lines,
      })
      .expect(400);
  });
});
