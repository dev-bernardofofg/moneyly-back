import request from 'supertest';
import type { Application } from 'express';

const HOUR = 60 * 60 * 1000;

type StoredPeriod = { startDate: string; endDate: string };

// endDate é a meia-noite do último dia: o período atual é o de início mais recente, não o que
// contém "agora" até endDate.
export async function currentPeriod(app: Application, token: string): Promise<StoredPeriod> {
  const res = await request(app)
    .get('/overview/periods')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const started = (res.body.data as StoredPeriod[])
    .filter((period) => new Date(period.startDate).getTime() <= Date.now())
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  return started[0]!;
}

// Instante no passado dentro do período atual: "agora - 3h" cai no período anterior
// entre 00h e 03h do primeiro dia, e registros iriam para o período errado.
export async function currentPeriodAnchor(app: Application, token: string): Promise<Date> {
  const period = await currentPeriod(app, token);
  const periodStart = new Date(period.startDate).getTime();
  return new Date(Math.max(Date.now() - 3 * HOUR, periodStart + 1000));
}

export function plusHours(anchor: Date, hours: number): string {
  return new Date(anchor.getTime() + hours * HOUR).toISOString();
}
