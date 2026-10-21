/**
 * Integration tests for accounts and cards (F12, step 1)
 */

import request from 'supertest';
import { app } from '../../src/server';

async function signUp(label: string) {
  const res = await request(app)
    .post('/auth/sign-up')
    .send({
      name: `Accounts ${label}`,
      email: `accounts-${label}-${Date.now()}@test.com`,
      password: 'password123',
    });
  return res.body.data.accessToken as string;
}

describe('Accounts', () => {
  let token: string;
  let otherToken: string;
  let categoryId: string;
  let defaultAccountId: string;
  let cardId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    token = await signUp('owner');
    otherToken = await signUp('other');
    const category = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Accounts Category ${Date.now()}` });
    categoryId = category.body.data.id;
  });

  it('requires authentication', async () => {
    await request(app).get('/accounts').expect(401);
  });

  it('creates the default account on first listing', async () => {
    const res = await request(app).get('/accounts').set(auth()).expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      name: 'Conta principal',
      type: 'checking',
      isDefault: true,
    });
    defaultAccountId = res.body.data[0].id;
  });

  it('creates a credit card with closing and due days', async () => {
    const res = await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'credit_card', name: 'Cartão Inter', closingDay: 25, dueDay: 5 })
      .expect(201);

    expect(res.body.data).toMatchObject({ type: 'credit_card', closingDay: 25, dueDay: 5 });
    cardId = res.body.data.id;
  });

  it('requires closing and due days for a credit card', async () => {
    await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'credit_card', name: 'Sem datas' })
      .expect(400);
  });

  it('rejects a duplicate name ignoring case', async () => {
    await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'checking', name: 'cartão inter' })
      .expect(409);
  });

  it('rejects closing and due days on a checking account', async () => {
    await request(app)
      .put(`/accounts/${defaultAccountId}`)
      .set(auth())
      .send({ closingDay: 10 })
      .expect(400);
  });

  it('does not let another user see or change the card', async () => {
    const other = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(other.body.data.map((account: { id: string }) => account.id)).not.toContain(cardId);

    await request(app)
      .put(`/accounts/${cardId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hijack' })
      .expect(404);
  });

  it('puts transactions without account in the default account', async () => {
    const res = await request(app)
      .post('/transactions/create')
      .set(auth())
      .send({ type: 'expense', title: 'Padaria', amount: 10, category: categoryId })
      .expect(201);

    expect(res.body.data.accountId).toBe(defaultAccountId);
  });

  it('creates a transaction in the chosen card and filters by account', async () => {
    await request(app)
      .post('/transactions/create')
      .set(auth())
      .send({ type: 'expense', title: 'Uber', amount: 25, category: categoryId, accountId: cardId })
      .expect(201);

    const res = await request(app)
      .get('/transactions/')
      .set(auth())
      .query({ page: 1, limit: 50, accountId: cardId })
      .expect(200);

    expect(res.body.data.map((transaction: { title: string }) => transaction.title)).toEqual([
      'Uber',
    ]);
  });

  it('rejects an account that belongs to another user', async () => {
    await request(app)
      .post('/transactions/create')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        type: 'expense',
        title: 'Invasão',
        amount: 5,
        category: categoryId,
        accountId: cardId,
      })
      .expect(404);
  });

  it('refuses to delete the default account', async () => {
    await request(app).delete(`/accounts/${defaultAccountId}`).set(auth()).expect(400);
  });

  it('soft deletes a card and hides it from the list', async () => {
    await request(app).delete(`/accounts/${cardId}`).set(auth()).expect(200);

    const res = await request(app).get('/accounts').set(auth()).expect(200);
    expect(res.body.data.map((account: { id: string }) => account.id)).not.toContain(cardId);
  });
});

describe('Credit card billing period', () => {
  let token: string;
  let categoryId: string;
  let cardId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const create = async (body: Record<string, unknown>) => {
    const res = await request(app)
      .post('/transactions/create')
      .set(auth())
      .send({ type: 'expense', title: 'Compra', amount: 10, category: categoryId, ...body })
      .expect(201);
    return res.body.data as { id: string; periodId: string; date: string };
  };

  // Período de referência: uma transação de conta corrente no próprio dia.
  const periodOf = async (date: string) => (await create({ date })).periodId;

  beforeAll(async () => {
    token = await signUp('billing');
    const category = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Billing Category ${Date.now()}` });
    categoryId = category.body.data.id;
    const card = await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'credit_card', name: 'Cartão Fatura', closingDay: 25, dueDay: 5 })
      .expect(201);
    cardId = card.body.data.id;
  });

  it('puts a card purchase in the period of the invoice due date', async () => {
    const purchase = await create({ date: '2026-09-10', accountId: cardId });

    expect(purchase.periodId).toBe(await periodOf('2026-10-05'));
    expect(purchase.date.slice(0, 10)).toBe('2026-09-10');
  });

  it('moves card purchases when the closing day changes', async () => {
    const purchase = await create({ date: '2026-08-12', accountId: cardId });
    expect(purchase.periodId).toBe(await periodOf('2026-09-05'));

    await request(app).put(`/accounts/${cardId}`).set(auth()).send({ closingDay: 5 }).expect(200);

    const res = await request(app)
      .get('/transactions/')
      .set(auth())
      .query({ page: 1, limit: 100, accountId: cardId })
      .expect(200);
    const moved = res.body.data.find(
      (transaction: { id: string }) => transaction.id === purchase.id
    );
    expect(moved.periodId).toBe(await periodOf('2026-10-05'));
  });

  it('recalculates the period when a transaction moves to the card', async () => {
    const transaction = await create({ date: '2026-09-01' });

    const res = await request(app)
      .put(`/transactions/${transaction.id}`)
      .set(auth())
      .send({ accountId: cardId })
      .expect(200);

    expect(res.body.data.periodId).toBe(await periodOf('2026-10-05'));
  });
});

describe('GET /overview/card-bills', () => {
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('groups the bill due in the period by card and category', async () => {
    token = await signUp('bills');
    const food = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Comida ${Date.now()}` });
    const ride = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Corrida ${Date.now()}` });
    const card = await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'credit_card', name: 'Cartão Bills', closingDay: 25, dueDay: 5 })
      .expect(201);
    const cardId = card.body.data.id;

    const spend = (category: string, amount: number, date: string, accountId?: string) =>
      request(app)
        .post('/transactions/create')
        .set(auth())
        .send({ type: 'expense', title: 'Compra', amount, category, date, accountId })
        .expect(201);

    // Compras de setembro (antes do fechamento 25) vencem em 05/10.
    await spend(food.body.data.id, 40, '2026-09-10', cardId);
    await spend(food.body.data.id, 10, '2026-09-11', cardId);
    await spend(ride.body.data.id, 25, '2026-09-12', cardId);
    // Conta corrente não entra nas faturas.
    const reference = await spend(food.body.data.id, 99, '2026-10-05');

    const res = await request(app)
      .get('/overview/card-bills')
      .set(auth())
      .query({ periodId: reference.body.data.periodId })
      .expect(200);

    expect(res.body.data.total).toBe(75);
    expect(res.body.data.bills).toEqual([
      expect.objectContaining({
        accountId: cardId,
        name: 'Cartão Bills',
        total: 75,
        categories: [
          expect.objectContaining({ categoryId: food.body.data.id, amount: 50 }),
          expect.objectContaining({ categoryId: ride.body.data.id, amount: 25 }),
        ],
      }),
    ]);
  });

  it('requires authentication', async () => {
    await request(app).get('/overview/card-bills').expect(401);
  });
});

describe('Opening balance', () => {
  let token: string;
  let categoryId: string;
  let defaultId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const spend = (amount: number, date: string) =>
    request(app)
      .post('/transactions/create')
      .set(auth())
      .send({ type: 'expense', title: 'Gasto', amount, category: categoryId, date })
      .expect(201);

  beforeAll(async () => {
    token = await signUp('opening');
    const category = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Opening ${Date.now()}` });
    categoryId = category.body.data.id;
    defaultId = (await request(app).get('/accounts').set(auth())).body.data[0].id;
  });

  it('rejects an opening balance on a card and a future date', async () => {
    const card = await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'credit_card', name: 'Cartão Saldo', closingDay: 25, dueDay: 5 })
      .expect(201);

    await request(app)
      .put(`/accounts/${card.body.data.id}`)
      .set(auth())
      .send({ openingBalance: 100, openingBalanceDate: '2026-09-01' })
      .expect(400);
    await request(app)
      .put(`/accounts/${defaultId}`)
      .set(auth())
      .send({ openingBalance: 100, openingBalanceDate: '2999-01-01' })
      .expect(400);
  });

  it('carries the balance and later flows into the free balance', async () => {
    await spend(50, '2026-08-20'); // antes do saldo: já está nele
    await spend(30, '2026-09-10'); // período anterior, depois do saldo
    const current = await spend(100, new Date().toISOString().slice(0, 10));

    const account = await request(app)
      .put(`/accounts/${defaultId}`)
      .set(auth())
      .send({ openingBalance: 1000, openingBalanceDate: '2026-09-01' })
      .expect(200);
    expect(account.body.data).toMatchObject({ openingBalance: 1000 });

    const res = await request(app)
      .get('/overview/forecast')
      .set(auth())
      .query({ periodId: current.body.data.periodId })
      .expect(200);

    expect(res.body.data.freeBalance.components.carryOverBalance).toBe(970);
    expect(res.body.data.realized.balance).toBe(-100);
    expect(res.body.data.freeBalance.total).toBe(870);
  });

  it('removes the opening balance when the date is cleared', async () => {
    await request(app)
      .put(`/accounts/${defaultId}`)
      .set(auth())
      .send({ openingBalanceDate: null })
      .expect(200);

    const res = await request(app).get('/overview/forecast').set(auth()).expect(200);
    expect(res.body.data.freeBalance.components.carryOverBalance).toBe(0);
  });
});

describe('Card recurrences', () => {
  let token: string;
  let categoryId: string;
  let cardId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    token = await signUp('card-recurring');
    const category = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Card Recurring ${Date.now()}` });
    categoryId = category.body.data.id;
    const card = await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'credit_card', name: 'Cartão Assinaturas', closingDay: 25, dueDay: 5 })
      .expect(201);
    cardId = card.body.data.id;
  });

  it('charges the card and lands in the period of the invoice due date', async () => {
    const recurring = await request(app)
      .post('/recurring-transactions')
      .set(auth())
      .send({
        type: 'expense',
        title: 'Streaming',
        amount: 5590,
        categoryId,
        accountId: cardId,
        frequency: 'monthly',
        totalInstallments: 1,
        startDate: '2026-09-10T03:00:00.000Z',
      })
      .expect(201);
    expect(recurring.body.data.accountId).toBe(cardId);

    const history = await request(app)
      .get(`/recurring-transactions/${recurring.body.data.id}/transactions`)
      .set(auth())
      .expect(200);
    const reference = await request(app)
      .post('/transactions/create')
      .set(auth())
      .send({ type: 'expense', title: 'Ref', amount: 1, category: categoryId, date: '2026-10-05' })
      .expect(201);

    expect(history.body.data[0]).toMatchObject({
      accountId: cardId,
      periodId: reference.body.data.periodId,
    });
  });

  it('moves recurrences to the default account when the card is removed', async () => {
    const recurring = await request(app)
      .post('/recurring-transactions')
      .set(auth())
      .send({
        type: 'expense',
        title: 'Academia',
        amount: 10700,
        categoryId,
        accountId: cardId,
        frequency: 'monthly',
        startDate: '2099-01-10T03:00:00.000Z',
      })
      .expect(201);

    await request(app).delete(`/accounts/${cardId}`).set(auth()).expect(200);

    const list = await request(app).get('/recurring-transactions').set(auth()).expect(200);
    const moved = list.body.data.find((item: { id: string }) => item.id === recurring.body.data.id);
    expect(moved.accountId).toBeNull();
  });
});
