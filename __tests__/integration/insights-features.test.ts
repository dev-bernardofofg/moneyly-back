/**
 * Integração F1 (forecast), F3 (subscriptions), F4 (comparison),
 * F5 (dashboard previews).
 */
import request from 'supertest';
import { app } from '../../src/server';

describe('Insights features (F1/F3/F4/F5)', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({
        name: 'Insights User',
        email: `insights${Date.now()}@test.com`,
        password: 'password123',
      });
    token = res.body.data.accessToken;
  });

  describe('GET /overview/forecast (F1)', () => {
    it('401 without token', async () => {
      await request(app).get('/overview/forecast').expect(401);
    });

    it('200 with forecast shape', async () => {
      const r = await request(app)
        .get('/overview/forecast')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(r.body.data).toHaveProperty('period');
      expect(r.body.data).toHaveProperty('realized');
      expect(r.body.data).toHaveProperty('projected');
      expect(r.body.data).toHaveProperty('projectedEndBalance');
      expect(r.body.data.freeBalance).toMatchObject({
        total: expect.any(Number),
        daysRemaining: expect.any(Number),
        confidence: expect.stringMatching(/^(low|medium|high)$/),
        income: expect.objectContaining({
          fixed: expect.any(Number),
          variable: expect.any(Number),
        }),
        commitments: expect.any(Object),
        reserves: expect.any(Object),
      });
      expect(Array.isArray(r.body.data.projected.occurrences)).toBe(true);
    });
  });

  describe('GET /transactions/subscriptions (F3)', () => {
    it('401 without token', async () => {
      await request(app).get('/transactions/subscriptions').expect(401);
    });

    it('200 array (empty for new user)', async () => {
      const r = await request(app)
        .get('/transactions/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(r.body.data)).toBe(true);
    });
  });

  describe('GET /overview/insights/comparison (F4)', () => {
    it('401 without token', async () => {
      await request(app).get('/overview/insights/comparison').expect(401);
    });

    it('200 with totals/byCategory/highlights', async () => {
      const r = await request(app)
        .get('/overview/insights/comparison?periodsBack=3')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(r.body.data).toHaveProperty('basis');
      expect(r.body.data).toHaveProperty('totals');
      expect(r.body.data.totals).toHaveProperty('signal');
      expect(Array.isArray(r.body.data.byCategory)).toBe(true);
      expect(Array.isArray(r.body.data.highlights)).toBe(true);
    });
  });

  describe('GET /overview/insights', () => {
    const auth = () => ({ Authorization: `Bearer ${token}` });

    it('401 without token', async () => {
      await request(app).get('/overview/insights').expect(401);
    });

    it('404 for a period of someone else', async () => {
      await request(app)
        .get('/overview/insights')
        .set(auth())
        .query({ periodId: '99999999-9999-9999-9999-999999999999' })
        .expect(404);
    });

    it('sums the period by category, card purchases in the invoice period', async () => {
      const category = await request(app)
        .post('/categories/create')
        .set(auth())
        .send({ name: `Insights ${Date.now()}` });
      const card = await request(app)
        .post('/accounts')
        .set(auth())
        .send({ type: 'credit_card', name: 'Cartão Insights', closingDay: 25, dueDay: 5 })
        .expect(201);
      const spend = (body: Record<string, unknown>) =>
        request(app)
          .post('/transactions/create')
          .set(auth())
          .send({ type: 'expense', title: 'Gasto', category: category.body.data.id, ...body })
          .expect(201);

      // Compra de 10/09 no cartão vence em 05/10: conta no período de outubro, não no de setembro.
      const purchase = await spend({
        amount: 4000,
        date: '2026-09-10',
        accountId: card.body.data.id,
      });
      await spend({ amount: 1000, date: '2026-10-05' });

      const r = await request(app)
        .get('/overview/insights')
        .set(auth())
        .query({ periodId: purchase.body.data.periodId })
        .expect(200);

      expect(r.body.data.period.id).toBe(purchase.body.data.periodId);
      expect(r.body.data.spending).toMatchObject({ expense: 5000 });
      expect(r.body.data.categories[0]).toMatchObject({
        categoryId: category.body.data.id,
        amount: 5000,
        share: 100,
      });
      expect(r.body.data.history.at(-1)).toMatchObject({ isSelected: true, expense: 5000 });
    });
  });

  describe('GET /overview/dashboard previews (F5)', () => {
    it('additive data.previews present', async () => {
      const r = await request(app)
        .get('/overview/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(r.body.data).toHaveProperty('previews');
      expect(r.body.data.previews.subscriptions).toMatchObject({
        count: expect.any(Number),
      });
      expect(r.body.data.previews.comparison).toHaveProperty('signal');
      // contrato R1 intacto
      expect(r.body.data).toHaveProperty('stats');
      expect(r.body.data).toHaveProperty('recentTransactions');
    });
  });
});
