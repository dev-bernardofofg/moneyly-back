/**
 * Integration tests for accountRepository.recordImport (statement key and coverage)
 */

import { eq } from 'drizzle-orm';
import request from 'supertest';
import { spMidnight } from '@core/helpers/dates';
import { db } from '@infra/db';
import { accounts } from '@infra/db/schema';
import { accountRepository } from '@modules/account/repositories/account.repository';
import { app } from '../../src/server';

describe('accountRepository.recordImport', () => {
  let userId: string;
  let firstId: string;
  let secondId: string;
  const auth = { Authorization: '' };

  const load = async (id: string) =>
    (await db.select().from(accounts).where(eq(accounts.id, id)))[0]!;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({
        name: 'Record Import',
        email: `record-import${Date.now()}@test.com`,
        password: 'password123',
      });
    auth.Authorization = `Bearer ${res.body.data.accessToken}`;
    userId = res.body.data.user.id;
    const list = await request(app).get('/accounts').set(auth).expect(200);
    firstId = list.body.data[0].id;
    secondId = (
      await request(app)
        .post('/accounts')
        .set(auth)
        .send({ type: 'checking', name: 'Segunda' })
        .expect(201)
    ).body.data.id;
  });

  it('sets coverage and key on the first import, when data_through is null', async () => {
    expect((await load(firstId)).dataThrough).toBeNull();

    await accountRepository.recordImport(firstId, userId, {
      statementKey: 'bank:1',
      through: spMidnight('2026-10-10'),
    });

    expect(await load(firstId)).toMatchObject({
      statementKey: 'bank:1',
      dataThrough: spMidnight('2026-10-10'),
    });
  });

  it('does not lower the coverage with an older file, and raises it with a newer one', async () => {
    await accountRepository.recordImport(firstId, userId, {
      statementKey: 'bank:1',
      through: spMidnight('2026-09-01'),
    });
    expect((await load(firstId)).dataThrough).toEqual(spMidnight('2026-10-10'));

    await accountRepository.recordImport(firstId, userId, {
      statementKey: 'bank:1',
      through: spMidnight('2026-10-20'),
    });
    expect((await load(firstId)).dataThrough).toEqual(spMidnight('2026-10-20'));
  });

  it('keeps the stored key when none is given', async () => {
    await accountRepository.recordImport(firstId, userId, { through: spMidnight('2026-10-25') });

    expect(await load(firstId)).toMatchObject({
      statementKey: 'bank:1',
      dataThrough: spMidnight('2026-10-25'),
    });
  });

  it('moves a key held by another account instead of raising a unique violation', async () => {
    await accountRepository.recordImport(secondId, userId, {
      statementKey: 'bank:1',
      through: spMidnight('2026-10-01'),
    });

    expect((await load(secondId)).statementKey).toBe('bank:1');
    expect((await load(firstId)).statementKey).toBeNull();
    expect((await load(firstId)).dataThrough).toEqual(spMidnight('2026-10-25'));
    expect((await accountRepository.findByStatementKey(userId, 'bank:1'))?.id).toBe(secondId);
  });
});
