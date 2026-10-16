/**
 * Integration tests for GET /overview/forecast and the freeBalance contract
 */

import request from 'supertest';
import { app } from '../../src/server';

const HOUR = 60 * 60 * 1000;

type Occurrence = { recurringTransactionId: string; date: string; amount: number };

async function signUp(label: string) {
  const res = await request(app)
    .post('/auth/sign-up')
    .send({
      name: `Forecast ${label}`,
      email: `forecast-${label}-${Date.now()}@test.com`,
      password: 'password123',
    });
  return res.body.data.accessToken as string;
}

async function getForecast(token: string) {
  const res = await request(app)
    .get('/overview/forecast')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body.data;
}

async function createCategory(token: string) {
  const res = await request(app)
    .post('/categories/create')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Forecast Category ${Date.now()}` });
  return res.body.data.id as string;
}

// /auth/sign-up tem rate limit de 10 por processo: reaproveitar usuários sem estado.
let emptyUser: string;
let intruder: string;

beforeAll(async () => {
  emptyUser = await signUp('empty');
  intruder = await signUp('intruder');
});

describe('GET /overview/forecast', () => {
  it('requires authentication', async () => {
    await request(app).get('/overview/forecast').expect(401);
  });

  it('returns the full freeBalance contract', async () => {
    const data = await getForecast(emptyUser);

    expect(data).toEqual({
      period: {
        id: expect.any(String),
        startDate: expect.any(String),
        endDate: expect.any(String),
        label: expect.any(String),
      },
      realized: { income: 0, expense: 0, balance: 0 },
      projected: { recurringIncome: 0, recurringExpense: 0, occurrences: [] },
      projectedEndBalance: 0,
      freeBalance: {
        total: 0,
        daysRemaining: expect.any(Number),
        confidence: expect.stringMatching(/^(low|medium|high)$/),
        income: { fixed: 0, variable: 0, pendingVariable: 0 },
        commitments: { recurringExpenses: 0 },
        reserves: { budgets: 0, goals: 0 },
        components: {
          realizedBalance: 0,
          futureRecurringIncome: 0,
          futureRecurringExpense: 0,
          pendingVariableIncome: 0,
          budgetReserve: 0,
          goalReserve: 0,
        },
      },
      asOf: expect.any(String),
    });
  });

  it('rejects an invalid periodId', async () => {
    await request(app)
      .get('/overview/forecast')
      .set('Authorization', `Bearer ${emptyUser}`)
      .query({ periodId: 'not-a-uuid' })
      .expect(400);
  });

  it('returns 404 for a period owned by another user', async () => {
    const { period } = await getForecast(emptyUser);

    await request(app)
      .get('/overview/forecast')
      .set('Authorization', `Bearer ${intruder}`)
      .query({ periodId: period.id })
      .expect(404);
  });

  it('does not project pre-created installments again', async () => {
    const token = await signUp('installments');
    const categoryId = await createCategory(token);

    const created = await request(app)
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        title: 'Parcelado',
        amount: 30,
        categoryId,
        frequency: 'monthly',
        totalInstallments: 3,
      })
      .expect(201);

    const data = await getForecast(token);
    const occurrences = (data.projected.occurrences as Occurrence[]).filter(
      (o) => o.recurringTransactionId === created.body.data.id
    );

    expect(data.realized.expense).toBe(30);
    expect(occurrences).toEqual([]);
    expect(data.projected.recurringExpense).toBe(0);
  });

  it('does not project an occurrence that was already materialized', async () => {
    const token = await signUp('materialized');
    const categoryId = await createCategory(token);

    const created = await request(app)
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', title: 'Diário', amount: 10, categoryId, frequency: 'daily' })
      .expect(201);
    const recurringId = created.body.data.id as string;

    const history = await request(app)
      .get(`/recurring-transactions/${recurringId}/transactions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const materialized = history.body.data as Array<{ date: string }>;
    expect(materialized).toHaveLength(1);
    const materializedDay = new Date(materialized[0]!.date).toISOString().slice(0, 10);

    const data = await getForecast(token);
    const occurrences = (data.projected.occurrences as Occurrence[]).filter(
      (o) => o.recurringTransactionId === recurringId
    );

    expect(data.realized.expense).toBe(10);
    expect(occurrences.map((o) => o.date.slice(0, 10))).not.toContain(materializedDay);
    expect(data.projected.recurringExpense).toBe(occurrences.length * 10);
    expect(data.freeBalance.commitments.recurringExpenses).toBe(occurrences.length * 10);
  });

  it('counts overtime as realized variable income', async () => {
    const token = await signUp('overtime');
    const company = await request(app)
      .post('/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Forecast Co', hourlyRate: 40 });

    await request(app)
      .post('/overtime')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyId: company.body.data.id,
        startTime: new Date(Date.now() - 2 * HOUR).toISOString(),
        endTime: new Date(Date.now() - HOUR).toISOString(),
      })
      .expect(201);

    const { freeBalance, realized } = await getForecast(token);

    expect(realized.income).toBe(40);
    expect(freeBalance.income).toEqual({ fixed: 0, variable: 40, pendingVariable: 0 });
    expect(freeBalance.components.realizedBalance).toBe(40);
    expect(freeBalance.total).toBe(40);
  });
});

describe('GET /overview/planner', () => {
  it('requires authentication', async () => {
    await request(app).get('/overview/planner').expect(401);
  });

  it('rejects an invalid periodId', async () => {
    await request(app)
      .get('/overview/planner')
      .set('Authorization', `Bearer ${emptyUser}`)
      .query({ periodId: 'not-a-uuid' })
      .expect(400);
  });

  it('returns 404 for a period owned by another user', async () => {
    const { period } = await getForecast(emptyUser);

    await request(app)
      .get('/overview/planner')
      .set('Authorization', `Bearer ${intruder}`)
      .query({ periodId: period.id })
      .expect(404);
  });

  it('reports the same reserves the forecast subtracts from the free balance', async () => {
    const token = await signUp('planner-impact');
    const categoryId = await createCategory(token);
    const targetDate = new Date(Date.now() + 365 * 24 * HOUR).toISOString().slice(0, 10);

    await request(app)
      .post('/budgets/')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId, monthlyLimit: 500 })
      .expect(201);
    await request(app)
      .post('/goals/')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Reserva', targetAmount: 1200, targetDate })
      .expect(201);

    const forecast = await getForecast(token);
    const planner = await request(app)
      .get('/overview/planner')
      .set('Authorization', `Bearer ${token}`)
      .query({ periodId: forecast.period.id })
      .expect(200);

    const { budgets, goals } = forecast.freeBalance.reserves;
    expect(budgets).toBe(500);
    expect(goals).toBeGreaterThan(0);
    expect(planner.body.data.currentPeriod.id).toBe(forecast.period.id);
    expect(planner.body.data.freeBalanceImpact).toEqual({
      budgetReserve: budgets,
      goalReserve: goals,
      total: Math.round((budgets + goals) * 100) / 100,
    });
  });
});
