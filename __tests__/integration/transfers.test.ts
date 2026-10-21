/**
 * Integration tests for transfers between checking accounts (manual + matched on import)
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

type PreviewItem = {
  externalId: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  title: string;
  status: string;
  transferOf: { transactionId: string; accountId: string } | null;
};

describe('Transfers', () => {
  let token: string;
  let categoryId: string;
  let mainId: string;
  let otherId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const balances = async () => {
    const res = await request(app).get('/accounts').set(auth()).expect(200);
    return Object.fromEntries(
      res.body.data.map((account: { id: string; currentBalance: number | null }) => [
        account.id,
        account.currentBalance,
      ])
    );
  };

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({
        name: 'Transfers',
        email: `transfers${Date.now()}@test.com`,
        password: 'password123',
      });
    token = res.body.data.accessToken;
    const category = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Transfers ${Date.now()}` });
    categoryId = category.body.data.id;
    mainId = (await request(app).get('/accounts').set(auth())).body.data[0].id;
    otherId = (
      await request(app)
        .post('/accounts')
        .set(auth())
        .send({
          type: 'checking',
          name: 'Nubank',
          openingBalance: 100000,
          openingBalanceDate: '2026-09-01',
        })
        .expect(201)
    ).body.data.id;
    await request(app)
      .put(`/accounts/${mainId}`)
      .set(auth())
      .send({ openingBalance: 50000, openingBalanceDate: '2026-09-01' })
      .expect(200);
  });

  it('moves money between accounts without counting as income or expense', async () => {
    const before = await request(app).get('/overview/forecast').set(auth()).expect(200);

    await request(app)
      .post('/transfers')
      .set(auth())
      .send({ fromAccountId: otherId, toAccountId: mainId, amount: 30000, date: '2026-10-01' })
      .expect(201);

    expect(await balances()).toMatchObject({ [otherId]: 70000, [mainId]: 80000 });
    const after = await request(app).get('/overview/forecast').set(auth()).expect(200);
    expect(after.body.data.realized).toEqual(before.body.data.realized);
    expect(after.body.data.freeBalance.total).toBe(before.body.data.freeBalance.total);
  });

  it('rejects a transfer to a card or to the same account', async () => {
    const card = await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'credit_card', name: 'Cartão T', closingDay: 25, dueDay: 5 })
      .expect(201);
    await request(app)
      .post('/transfers')
      .set(auth())
      .send({
        fromAccountId: mainId,
        toAccountId: card.body.data.id,
        amount: 100,
        date: '2026-10-01',
      })
      .expect(400);
    await request(app)
      .post('/transfers')
      .set(auth())
      .send({ fromAccountId: mainId, toAccountId: mainId, amount: 100, date: '2026-10-01' })
      .expect(400);
  });

  it('pairs a statement row with the other side already in another account', async () => {
    // PIX saiu do Nubank (lançado à mão) e entra no extrato da conta principal.
    const pix = await request(app)
      .post('/transactions/create')
      .set(auth())
      .send({
        type: 'expense',
        title: 'PIX para mim',
        amount: 25000,
        category: categoryId,
        date: '2026-10-02',
        accountId: otherId,
      })
      .expect(201);
    const content = ofx([
      { fitId: 't1', date: '20261003', amount: '250.00', memo: 'PIX RECEBIDO' },
    ]);
    const file = Buffer.from(content, 'utf8').toString('base64url');

    const preview = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file, accountId: mainId })
      .expect(200);
    const [item] = preview.body.data.items as PreviewItem[];
    expect(item).toMatchObject({
      status: 'transfer',
      transferOf: { transactionId: pix.body.data.id, accountId: otherId },
    });

    const balanceBefore = await balances();
    const confirm = await request(app)
      .post('/transactions/import')
      .set(auth())
      .send({
        accountId: mainId,
        items: [
          {
            externalId: item!.externalId,
            type: item!.type,
            amount: item!.amount,
            date: item!.date,
            title: item!.title,
            transferOf: item!.transferOf!.transactionId,
          },
        ],
      })
      .expect(201);
    expect(confirm.body.data).toMatchObject({ created: 0, transfers: 1 });

    // A despesa do Nubank virou a saída da transferência: o saldo dele não muda, o da principal sobe.
    expect(await balances()).toMatchObject({
      [otherId]: balanceBefore[otherId],
      [mainId]: balanceBefore[mainId] + 25000,
    });
    await request(app).get(`/transactions/${pix.body.data.id}`).set(auth()).expect(404);

    const again = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file, accountId: mainId })
      .expect(200);
    expect(again.body.data.items[0].status).toBe('imported');

    const list = await request(app).get('/transfers').set(auth()).expect(200);
    expect(list.body.data).toHaveLength(2);
  });
});
