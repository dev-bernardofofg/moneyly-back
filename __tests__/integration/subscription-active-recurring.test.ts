/**
 * Recorrência não cria transação: a linha importada igual a ela nunca ganha vínculo e não pode
 * seguir como assinatura candidata.
 */

import request from 'supertest';
import { spDayString, spMidnightPlusDays, spParts } from '@core/helpers/dates';
import { db } from '@infra/db';
import { recurringTransactions } from '@infra/db/schema';
import { app } from '../../src/server';

const dayAt = (offset: number) => {
  const { year, month, day } = spParts(new Date());
  return spMidnightPlusDays(year, month, day, offset);
};
const ymd = (offset: number) => spDayString(dayAt(offset)).replace(/-/g, '');

const statement = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKACCTFROM><BANKID>0088<ACCTID>assinaturas</BANKACCTFROM>
<BANKTRANLIST>
${[-90, -60, -30]
  .map(
    (offset) =>
      `<STMTTRN>\n<TRNTYPE>OTHER\n<DTPOSTED>${ymd(offset)}\n<TRNAMT>-39.90\n<FITID>s${offset}\n<MEMO>Spotify`
  )
  .join('\n')}
</BANKTRANLIST>
</OFX>`;

describe('Subscriptions already tracked by an active recurrence', () => {
  let token: string;
  let userId: string;
  let categoryId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const candidates = async () =>
    (await request(app).get('/transactions/subscriptions').set(auth()).expect(200)).body.data as {
      title: string;
    }[];

  const previews = async () =>
    (await request(app).get('/overview/dashboard').set(auth()).expect(200)).body.data.previews
      .subscriptions;

  const addRecurrence = (title: string, isActive: boolean) =>
    db.insert(recurringTransactions).values({
      userId,
      categoryId,
      title,
      type: 'expense',
      amount: 3990,
      frequency: 'monthly',
      dayOfMonth: 5,
      nextExecution: dayAt(20),
      isActive,
    });

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({
        name: 'Subscriptions',
        email: `subscriptions-${Date.now()}@test.com`,
        password: 'password123',
      });
    token = res.body.data.accessToken;
    categoryId = (
      await request(app)
        .post('/categories/create')
        .set(auth())
        .send({ name: `Assinaturas ${Date.now()}` })
    ).body.data.id;
    const list = await request(app).get('/accounts').set(auth()).expect(200);
    userId = list.body.data[0].userId;
    const accountId = list.body.data[0].id;

    const preview = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file: Buffer.from(statement, 'utf8').toString('base64url'), accountId })
      .expect(200);
    await request(app)
      .post('/transactions/import')
      .set(auth())
      .send({
        accountId,
        accountKey: preview.body.data.accountKey,
        through: preview.body.data.through,
        items: preview.body.data.items.map(
          (item: { externalId: string; type: string; amount: number; date: string }) => ({
            externalId: item.externalId,
            type: item.type,
            amount: item.amount,
            date: item.date,
            title: 'Spotify',
            categoryId,
          })
        ),
      })
      .expect(201);
  });

  it('keeps the line as a candidate with no active recurrence', async () => {
    await addRecurrence('Spotify', false);

    expect((await candidates()).map(({ title }) => title)).toEqual(['Spotify']);
    expect(await previews()).toMatchObject({ count: 1, topTitle: 'Spotify' });
  });

  it('drops the line from both lists once an active recurrence has the same title', async () => {
    await addRecurrence('SPOTIFY 03/12', true);

    expect(await candidates()).toEqual([]);
    expect(await previews()).toEqual({ count: 0, topMonthlyCost: null, topTitle: null });
  });
});
