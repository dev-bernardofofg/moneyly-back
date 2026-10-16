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
});
