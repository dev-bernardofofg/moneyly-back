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
