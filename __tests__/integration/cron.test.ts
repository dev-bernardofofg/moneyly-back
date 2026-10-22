/**
 * Integration tests for the Vercel Cron entrypoint
 */

import request from 'supertest';
import { app } from '../../src/server';

describe('GET /internal/cron/daily', () => {
  it('rejects a request without the cron secret', async () => {
    await request(app).get('/internal/cron/daily').expect(401);
  });

  it('rejects a wrong cron secret', async () => {
    await request(app)
      .get('/internal/cron/daily')
      .set('Authorization', 'Bearer wrong-secret')
      .expect(401);
  });

  it('runs the scheduled jobs with the cron secret', async () => {
    const res = await request(app)
      .get('/internal/cron/daily')
      .set('Authorization', 'Bearer test-cron-secret')
      .expect(200);

    expect(res.body.message).toBe('Jobs agendados executados');
  });

  it('is not subject to the browser CORS policy', async () => {
    await request(app)
      .get('/internal/cron/daily')
      .set('Origin', 'https://not-allowed.example')
      .set('Authorization', 'Bearer test-cron-secret')
      .expect(200);
  });

  it('does not materialize twice a recurrence created while the jobs run', async () => {
    const signUp = await request(app)
      .post('/auth/sign-up')
      .send({
        name: 'Cron Race',
        email: `cron-race${Date.now()}@test.com`,
        password: 'password123',
      });
    const auth = { Authorization: `Bearer ${signUp.body.data.accessToken}` };
    const category = await request(app)
      .post('/categories/create')
      .set(auth)
      .send({ name: `Cron Race ${Date.now()}` });

    const [created] = await Promise.all([
      request(app)
        .post('/recurring-transactions')
        .set(auth)
        .send({
          type: 'expense',
          title: 'Diário',
          amount: 1000,
          categoryId: category.body.data.id,
          frequency: 'daily',
        })
        .expect(201),
      request(app)
        .get('/internal/cron/daily')
        .set('Authorization', 'Bearer test-cron-secret')
        .expect(200),
      request(app)
        .get('/internal/cron/daily')
        .set('Authorization', 'Bearer test-cron-secret')
        .expect(200),
    ]);
    await request(app)
      .get('/internal/cron/daily')
      .set('Authorization', 'Bearer test-cron-secret')
      .expect(200);

    const history = await request(app)
      .get(`/recurring-transactions/${created.body.data.id}/transactions`)
      .set(auth)
      .expect(200);
    expect(history.body.data).toHaveLength(1);
  });
});
