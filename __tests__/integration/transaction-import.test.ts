/**
 * Integration tests for OFX statement import (preview + confirm)
 */

import { eq } from 'drizzle-orm';
import request from 'supertest';
import { spDayString, spMidnight, spMidnightPlusDays, spParts } from '@core/helpers/dates';
import { db } from '@infra/db';
import { accounts } from '@infra/db/schema';
import { app } from '../../src/server';

const ofx = (
  rows: Array<{ fitId: string; date: string; amount: string; memo: string }>,
  { acctId = '777', dtEnd }: { acctId?: string | null; dtEnd?: string } = {}
) => `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKACCTFROM><BANKID>0001${acctId ? `<ACCTID>${acctId}` : ''}</BANKACCTFROM>
<BANKTRANLIST>
${dtEnd ? `<DTEND>${dtEnd}` : ''}
${rows
  .map(
    (row) =>
      `<STMTTRN>\n<TRNTYPE>OTHER\n<DTPOSTED>${row.date}\n<TRNAMT>${row.amount}\n<FITID>${row.fitId}\n<MEMO>${row.memo}`
  )
  .join('\n')}
</BANKTRANLIST>
</OFX>`;

const STATEMENT = { accountKey: '0001:777', through: spMidnight('2026-10-01').toISOString() };

const toFile = (content: string) => Buffer.from(content, 'utf8').toString('base64url');

type PreviewItem = {
  externalId: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  title: string;
  status: 'new' | 'imported' | 'possible_duplicate';
  duplicateOf: string | null;
  suggestedCategoryId: string | null;
};

describe('Transaction import', () => {
  let token: string;
  let categoryId: string;
  let accountId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({
        name: 'Import User',
        email: `import${Date.now()}@test.com`,
        password: 'password123',
      });
    token = res.body.data.accessToken;

    const category = await request(app)
      .post('/categories/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Mercado ${Date.now()}` });
    categoryId = category.body.data.id;

    const accounts = await request(app).get('/accounts').set('Authorization', `Bearer ${token}`);
    accountId = accounts.body.data[0].id;
  });

  const preview = async (content: string) => {
    const res = await request(app)
      .post('/transactions/import/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ file: toFile(content), accountId })
      .expect(200);
    return res.body.data.items as PreviewItem[];
  };

  const confirm = (items: PreviewItem[], targetAccountId: string | null = accountId) =>
    request(app)
      .post('/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        accountId: targetAccountId ?? undefined,
        ...STATEMENT,
        items: items.map(({ externalId, type, amount, date, title, suggestedCategoryId }) => ({
          externalId,
          type,
          amount,
          date,
          title,
          categoryId: suggestedCategoryId ?? categoryId,
        })),
      });

  it('requires authentication', async () => {
    await request(app).post('/transactions/import/preview').send({ file: 'eA' }).expect(401);
    await request(app).post('/transactions/import').send({ items: [] }).expect(401);
  });

  it('rejects content that is not OFX', async () => {
    await request(app)
      .post('/transactions/import/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ file: toFile('data;valor\n2026-10-01;10') })
      .expect(400);
  });

  it('previews, imports and then flags the same rows as already imported', async () => {
    const content = ofx([
      { fitId: 'f1', date: '20260903', amount: '-25.00', memo: 'Padaria Central' },
      { fitId: 'f2', date: '20260904', amount: '3000.00', memo: 'Salario Empresa' },
    ]);

    const items = await preview(content);
    expect(items.map((item) => item.status)).toEqual(['new', 'new']);
    expect(items[0]).toMatchObject({ type: 'expense', amount: 2500, title: 'Padaria Central' });

    const res = await confirm(items).expect(201);
    expect(res.body.data).toEqual({
      created: 2,
      skipped: 0,
      billsPaid: 0,
      transfers: 0,
      linked: 0,
    });

    const again = await preview(content);
    expect(again.map((item) => item.status)).toEqual(['imported', 'imported']);
  });

  it('skips rows already imported when confirming twice', async () => {
    const items = await preview(
      ofx([{ fitId: 'f3', date: '20260905', amount: '-12.00', memo: 'Estacionamento' }])
    );

    await confirm(items).expect(201);
    const res = await confirm(items).expect(201);

    expect(res.body.data).toEqual({
      created: 0,
      skipped: 1,
      billsPaid: 0,
      transfers: 0,
      linked: 0,
    });
  });

  it('flags a manual transaction with same type, amount and day as possible duplicate', async () => {
    const manual = await request(app)
      .post('/transactions/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        title: 'Farmácia',
        amount: 3750,
        category: categoryId,
        date: '2026-09-10',
      })
      .expect(201);

    const [item] = await preview(
      ofx([{ fitId: 'f4', date: '20260910', amount: '-37.50', memo: 'DROGARIA XPTO' }])
    );

    expect(item).toMatchObject({ status: 'possible_duplicate', duplicateOf: manual.body.data.id });
  });

  it('suggests the category last used for the same title', async () => {
    await request(app)
      .post('/transactions/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        title: 'Supermercado Bom Preço',
        amount: 8000,
        category: categoryId,
        date: '2026-08-01',
      })
      .expect(201);

    const [item] = await preview(
      ofx([{ fitId: 'f5', date: '20260912', amount: '-150.00', memo: 'Supermercado Bom Preço' }])
    );

    expect(item!.suggestedCategoryId).toBe(categoryId);
  });

  it('requires the target account', async () => {
    const items = await preview(
      ofx([{ fitId: 'f6', date: '20260913', amount: '-9.00', memo: 'Banca' }])
    );

    await confirm(items, null).expect(400);
  });

  it('flags the card bill payment debited on a checking statement', async () => {
    const [item] = await preview(
      ofx([
        {
          fitId: 'f7',
          date: '20260914',
          amount: '-3822.00',
          memo: 'PAGAMENTO FATURA CARTAO INTER',
        },
      ])
    );

    expect(item!.status).toBe('bill_payment');
  });

  it('imports card rows into the invoice period', async () => {
    const card = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'credit_card', name: 'Cartão Import', closingDay: 25, dueDay: 5 })
      .expect(201);
    const items = await preview(
      ofx([{ fitId: 'c1', date: '20260910', amount: '-30.00', memo: 'DL*UberRides' }])
    );
    await confirm(items, card.body.data.id).expect(201);

    const reference = await request(app)
      .post('/transactions/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', title: 'Ref', amount: 1, category: categoryId, date: '2026-10-05' })
      .expect(201);
    const list = await request(app)
      .get('/transactions/')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 1, limit: 10, accountId: card.body.data.id })
      .expect(200);

    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].periodId).toBe(reference.body.data.periodId);
  });
});

describe('Transaction import: statement account and coverage', () => {
  let token: string;
  let strangerToken: string;
  let categoryId: string;
  let mainId: string;
  let otherId: string;

  const auth = (value = token) => ({ Authorization: `Bearer ${value}` });
  const dayAt = (offset: number) => {
    const { year, month, day } = spParts(new Date());
    return spMidnightPlusDays(year, month, day, offset);
  };
  const ymd = (offset: number) => spDayString(dayAt(offset)).replace(/-/g, '');
  const account = async (id: string) =>
    (await db.select().from(accounts).where(eq(accounts.id, id)))[0]!;

  const signUp = async (label: string) => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({
        name: `Coverage ${label}`,
        email: `coverage-${label}-${Date.now()}@test.com`,
        password: 'password123',
      });
    return res.body.data.accessToken as string;
  };

  const previewBody = async (
    content: string,
    accountId?: string,
    as = token
  ): Promise<PreviewBody> =>
    (
      await request(app)
        .post('/transactions/import/preview')
        .set(auth(as))
        .send({ file: toFile(content), accountId })
        .expect(200)
    ).body.data;

  const confirmPreview = (data: PreviewBody, accountId: string, through = data.through) =>
    request(app)
      .post('/transactions/import')
      .set(auth())
      .send({
        accountId,
        accountKey: data.accountKey,
        through,
        items: data.items.map(({ externalId, type, amount, date, title }) => ({
          externalId,
          type,
          amount,
          date,
          title,
          categoryId,
        })),
      });

  type PreviewBody = {
    accountId: string | null;
    needsAccount: boolean;
    accountKey: string;
    through: string;
    items: PreviewItem[];
  };

  const statement = (fitId: string, offset: number, options?: Parameters<typeof ofx>[1]) =>
    ofx([{ fitId, date: ymd(offset), amount: '-10.00', memo: `Compra ${fitId}` }], options);

  beforeAll(async () => {
    token = await signUp('owner');
    strangerToken = await signUp('stranger');
    categoryId = (
      await request(app)
        .post('/categories/create')
        .set(auth())
        .send({ name: `Cobertura ${Date.now()}` })
    ).body.data.id;
    const list = await request(app).get('/accounts').set(auth()).expect(200);
    mainId = list.body.data[0].id;
    otherId = (
      await request(app)
        .post('/accounts')
        .set(auth())
        .send({ type: 'checking', name: 'Outra conta' })
        .expect(201)
    ).body.data.id;
  });

  it('asks for the account when the statement key is unknown', async () => {
    const data = await previewBody(statement('k1', -3));

    expect(data).toMatchObject({
      needsAccount: true,
      accountId: null,
      accountKey: '0001:777',
      items: [],
    });
    expect(data.through).toBe(dayAt(-3).toISOString());
  });

  it('records the key and coverage on confirm and recognizes the account afterwards', async () => {
    const data = await previewBody(statement('k1', -3), mainId);
    expect(data).toMatchObject({ needsAccount: false, accountId: mainId });
    await confirmPreview(data, mainId).expect(201);

    expect(await account(mainId)).toMatchObject({
      statementKey: '0001:777',
      dataThrough: dayAt(-3),
    });

    const next = await previewBody(statement('k2', -2));
    expect(next).toMatchObject({ needsAccount: false, accountId: mainId });
    expect(next.items).toHaveLength(1);
  });

  it('never lowers the coverage when an older file is sent', async () => {
    const data = await previewBody(statement('k3', -10));
    await confirmPreview(data, mainId).expect(201);

    expect((await account(mainId)).dataThrough).toEqual(dayAt(-3));
  });

  it('clamps a future DTEND to today', async () => {
    const data = await previewBody(statement('k4', -1, { dtEnd: ymd(20) }));
    expect(data.through).toBe(dayAt(20).toISOString());
    await confirmPreview(data, mainId).expect(201);

    expect((await account(mainId)).dataThrough).toEqual(dayAt(0));
  });

  it('clamps a future through sent straight to confirm', async () => {
    const data = await previewBody(statement('k5', -1), otherId);
    await confirmPreview(data, otherId, dayAt(40).toISOString()).expect(201);

    expect((await account(otherId)).dataThrough).toEqual(dayAt(0));
  });

  it('lets an explicit account win over the stored key', async () => {
    const data = await previewBody(statement('k6', -1), otherId);

    expect(data).toMatchObject({ needsAccount: false, accountId: otherId });
  });

  it('fails for an account of another user', async () => {
    const content = statement('k7', -1);

    await request(app)
      .post('/transactions/import/preview')
      .set(auth(strangerToken))
      .send({ file: toFile(content), accountId: mainId })
      .expect(404);
    const data = await previewBody(content, mainId);
    const before = (await account(mainId)).dataThrough;
    await request(app)
      .post('/transactions/import')
      .set(auth(strangerToken))
      .send({
        accountId: mainId,
        accountKey: data.accountKey,
        through: dayAt(0).toISOString(),
        items: data.items.map(({ externalId, type, amount, date, title }) => ({
          externalId,
          type,
          amount,
          date,
          title,
          categoryId,
        })),
      })
      .expect(404);
    expect((await account(mainId)).dataThrough).toEqual(before);
  });

  it('moves the key to the chosen account when another one already holds it', async () => {
    const data = await previewBody(statement('k8', -1), otherId);
    await confirmPreview(data, otherId).expect(201);

    expect((await account(otherId)).statementKey).toBe('0001:777');
    expect((await account(mainId)).statementKey).toBeNull();
    expect(await previewBody(statement('k9', -1))).toMatchObject({
      needsAccount: false,
      accountId: otherId,
    });
  });

  it('does not trust a weak key: it is never stored and always asks for the account', async () => {
    const content = statement('w1', -1, { acctId: null });
    const data = await previewBody(content, mainId);
    expect(data.accountKey).toBe('0001:unknown');
    await confirmPreview(data, mainId).expect(201);

    expect((await account(mainId)).statementKey).toBeNull();
    expect((await account(mainId)).dataThrough).toEqual(dayAt(0));
    expect(await previewBody(content)).toMatchObject({
      needsAccount: true,
      accountId: null,
      items: [],
    });
  });

  it('previews a statement without rows and records its coverage on confirm', async () => {
    await db
      .update(accounts)
      .set({ statementKey: null, dataThrough: null })
      .where(eq(accounts.id, mainId));
    const content = ofx([], { acctId: 'empty', dtEnd: ymd(-2) });

    const unknown = await previewBody(content);
    expect(unknown).toMatchObject({ needsAccount: true, accountKey: '0001:empty', items: [] });
    expect(unknown.through).toBe(dayAt(-2).toISOString());

    const data = await previewBody(content, mainId);
    expect(data).toMatchObject({ needsAccount: false, accountId: mainId, items: [] });
    expect(data.through).toBe(dayAt(-2).toISOString());
    await confirmPreview(data, mainId).expect(201);

    expect(await account(mainId)).toMatchObject({
      statementKey: '0001:empty',
      dataThrough: dayAt(-2),
    });
  });

  it('keeps clamping a future DTEND of a statement without rows', async () => {
    const data = await previewBody(ofx([], { acctId: 'empty', dtEnd: ymd(15) }), mainId);
    await confirmPreview(data, mainId).expect(201);

    expect((await account(mainId)).dataThrough).toEqual(dayAt(0));
  });

  it('rejects a statement without rows and without DTEND', async () => {
    const res = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file: toFile(ofx([], { acctId: 'none' })), accountId: mainId })
      .expect(400);

    expect(res.body.error).toBe('Nenhuma transação encontrada no extrato');
  });

  it('still records coverage and key when every row was already imported', async () => {
    const content = statement('h1', -1, { acctId: 'heal' });
    const first = await previewBody(content, mainId);
    await confirmPreview(first, mainId).expect(201);
    await db
      .update(accounts)
      .set({ statementKey: null, dataThrough: null })
      .where(eq(accounts.id, mainId));

    const again = await previewBody(content, mainId);
    expect(again.items.map((item) => item.status)).toEqual(['imported']);
    await request(app)
      .post('/transactions/import')
      .set(auth())
      .send({
        accountId: mainId,
        accountKey: again.accountKey,
        through: again.through,
        items: [],
        billPayments: [],
      })
      .expect(201);

    expect(await account(mainId)).toMatchObject({
      statementKey: '0001:heal',
      dataThrough: dayAt(-1),
    });
  });
});
