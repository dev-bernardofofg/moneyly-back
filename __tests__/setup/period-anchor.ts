import request from 'supertest';
import type { Application } from 'express';

const HOUR = 60 * 60 * 1000;

// Instante no passado dentro do período atual: "agora - 3h" cai no período anterior
// entre 00h e 03h do primeiro dia, e registros iriam para o período errado.
export async function currentPeriodAnchor(app: Application, token: string): Promise<Date> {
  const res = await request(app)
    .get('/overview/forecast')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const periodStart = new Date(res.body.data.period.startDate).getTime();
  return new Date(Math.max(Date.now() - 3 * HOUR, periodStart + 1000));
}

export function plusHours(anchor: Date, hours: number): string {
  return new Date(anchor.getTime() + hours * HOUR).toISOString();
}
