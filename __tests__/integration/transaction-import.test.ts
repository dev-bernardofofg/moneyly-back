/**
 * Integration tests for OFX statement import (preview + confirm)
 */

import request from 'supertest';
import { app } from '../../src/server';

const ofx = (rows: Array<{ fitId: string; date: string; amount: string; memo: string }>) => `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKACCTFROM><BANKID>0001<ACCTID>777</BANKACCTFROM>
<BANKTRANLIST>
${rows
  .map(
    (row) =>
      `<STMTTRN>\n<TRNTYPE>OTHER\n<DTPOSTED>${row.date}\n<TRNAMT>${row.amount}\n<FITID>${row.fitId}\n<MEMO>${row.memo}`
  )
  .join('\n')}
</BANKTRANLIST>
</OFX>`;

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
  });

  const preview = async (content: string) => {
    const res = await request(app)
      .post('/transactions/import/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ file: toFile(content) })
      .expect(200);
    return res.body.data.items as PreviewItem[];
  };

  const confirm = (items: PreviewItem[]) =>
    request(app)
      .post('/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
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
    expect(items[0]).toMatchObject({ type: 'expense', amount: 25, title: 'Padaria Central' });

    const res = await confirm(items).expect(201);
    expect(res.body.data).toEqual({ created: 2, skipped: 0 });

    const again = await preview(content);
    expect(again.map((item) => item.status)).toEqual(['imported', 'imported']);
  });

  it('skips rows already imported when confirming twice', async () => {
    const items = await preview(
      ofx([{ fitId: 'f3', date: '20260905', amount: '-12.00', memo: 'Estacionamento' }])
    );

    await confirm(items).expect(201);
    const res = await confirm(items).expect(201);

    expect(res.body.data).toEqual({ created: 0, skipped: 1 });
  });

  it('flags a manual transaction with same type, amount and day as possible duplicate', async () => {
    const manual = await request(app)
      .post('/transactions/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        title: 'Farmácia',
        amount: 37.5,
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
        amount: 80,
        category: categoryId,
        date: '2026-08-01',
      })
      .expect(201);

    const [item] = await preview(
      ofx([{ fitId: 'f5', date: '20260912', amount: '-150.00', memo: 'Supermercado Bom Preço' }])
    );

    expect(item!.suggestedCategoryId).toBe(categoryId);
  });
});
