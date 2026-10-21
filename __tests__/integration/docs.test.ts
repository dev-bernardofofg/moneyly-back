import request from 'supertest';
import { app } from '../../src/server';

describe('API docs', () => {
  it('serves the generated OpenAPI document', async () => {
    const res = await request(app).get('/api-docs.json').expect(200);

    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths).toHaveProperty(['/overview/forecast']);
  });
});
