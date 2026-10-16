/**
 * Integration tests for companies and overtime, including the linked income transaction
 */

import request from 'supertest';
import { app } from '../../src/server';
import { currentPeriodAnchor, plusHours } from '../setup/period-anchor';

async function signUp(label: string) {
  const res = await request(app)
    .post('/auth/sign-up')
    .send({
      name: `Overtime ${label}`,
      email: `overtime-${label}-${Date.now()}@test.com`,
      password: 'password123',
    });
  return res.body.data.accessToken as string;
}

async function listTransactions(token: string) {
  const res = await request(app)
    .get('/transactions/')
    .set('Authorization', `Bearer ${token}`)
    .query({ page: 1, limit: 100 })
    .expect(200);
  return res.body.data as Array<{ id: string; amount: string | number; type: string }>;
}

async function listOvertime(token: string) {
  const res = await request(app)
    .get('/overtime')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body.data as Array<{ id: string; transactionId: string | null; amount: string }>;
}

describe('Company Endpoints', () => {
  let token: string;
  let otherToken: string;
  let companyId: string;

  beforeAll(async () => {
    token = await signUp('company');
    otherToken = await signUp('company-other');
  });

  it('requires authentication', async () => {
    await request(app).get('/companies').expect(401);
    await request(app).post('/companies').send({ name: 'X', hourlyRate: 10 }).expect(401);
  });

  it('creates a company', async () => {
    const res = await request(app)
      .post('/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Acme', hourlyRate: 50 })
      .expect(201);

    expect(res.body.data).toMatchObject({ name: 'Acme', isActive: true });
    expect(Number(res.body.data.hourlyRate)).toBe(50);
    companyId = res.body.data.id;
  });

  it('rejects a non-positive hourly rate', async () => {
    await request(app)
      .post('/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Free', hourlyRate: 0 })
      .expect(400);
  });

  it('lists only the owner companies', async () => {
    const own = await request(app)
      .get('/companies')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(own.body.data.map((c: { id: string }) => c.id)).toContain(companyId);

    const other = await request(app)
      .get('/companies')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(other.body.data).toEqual([]);
  });

  it('updates a company', async () => {
    const res = await request(app)
      .put(`/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Acme Ltda', hourlyRate: 60 })
      .expect(200);

    expect(res.body.data.name).toBe('Acme Ltda');
    expect(Number(res.body.data.hourlyRate)).toBe(60);
  });

  it('does not let another user update the company', async () => {
    await request(app)
      .put(`/companies/${companyId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hijack' })
      .expect(404);
  });

  it('soft deletes a company and hides it from the list', async () => {
    await request(app)
      .delete(`/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .get('/companies')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.map((c: { id: string }) => c.id)).not.toContain(companyId);
  });
});

describe('Overtime Endpoints', () => {
  let token: string;
  let otherToken: string;
  let companyId: string;
  let anchor: Date;

  beforeAll(async () => {
    token = await signUp('records');
    anchor = await currentPeriodAnchor(app, token);
    otherToken = await signUp('records-other');

    const company = await request(app)
      .post('/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Overtime Co', hourlyRate: 50 });
    companyId = company.body.data.id;
  });

  async function createOvertime(hours: number) {
    const res = await request(app)
      .post('/overtime')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId, startTime: anchor.toISOString(), endTime: plusHours(anchor, hours) })
      .expect(201);
    return res.body.data as { id: string; transactionId: string; amount: string };
  }

  it('requires authentication', async () => {
    await request(app).get('/overtime').expect(401);
    await request(app).post('/overtime').send({}).expect(401);
  });

  it('rejects a start time in the future', async () => {
    await request(app)
      .post('/overtime')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId, startTime: plusHours(new Date(), 2), endTime: plusHours(new Date(), 3) })
      .expect(400);
  });

  it('creates a record and a linked income transaction', async () => {
    const record = await createOvertime(1);

    expect(Number(record.amount)).toBe(50);
    expect(record.transactionId).toEqual(expect.any(String));

    const transaction = (await listTransactions(token)).find((t) => t.id === record.transactionId);
    expect(transaction).toBeDefined();
    expect(transaction!.type).toBe('income');
    expect(Number(transaction!.amount)).toBe(50);
  });

  it('lists the created record', async () => {
    const records = await listOvertime(token);
    expect(records.length).toBeGreaterThan(0);

    const otherRecords = await listOvertime(otherToken);
    expect(otherRecords).toEqual([]);
  });

  it('syncs the linked transaction when the record is updated', async () => {
    const record = await createOvertime(1);

    const res = await request(app)
      .put(`/overtime/${record.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ endTime: plusHours(anchor, 2) })
      .expect(200);
    expect(Number(res.body.data.amount)).toBe(100);

    const transaction = (await listTransactions(token)).find((t) => t.id === record.transactionId);
    expect(Number(transaction!.amount)).toBe(100);
  });

  it('does not let another user update or delete the record', async () => {
    const record = await createOvertime(1);

    await request(app)
      .put(`/overtime/${record.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ description: 'hijack' })
      .expect(404);
    await request(app)
      .delete(`/overtime/${record.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('removes the linked transaction when the record is deleted', async () => {
    const record = await createOvertime(1);

    await request(app)
      .delete(`/overtime/${record.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const transactions = await listTransactions(token);
    expect(transactions.map((t) => t.id)).not.toContain(record.transactionId);
    expect((await listOvertime(token)).map((r) => r.id)).not.toContain(record.id);
  });

  it('unlinks the record when its transaction is deleted directly', async () => {
    const record = await createOvertime(1);

    await request(app)
      .delete(`/transactions/${record.transactionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const stored = (await listOvertime(token)).find((r) => r.id === record.id);
    expect(stored).toBeDefined();
    expect(stored!.transactionId).toBeNull();
  });
});
