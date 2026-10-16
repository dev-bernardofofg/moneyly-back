import { config } from 'dotenv';
import path from 'path';
import { assertTestDatabaseUrl } from './__tests__/setup/assert-test-database';

// Antes de qualquer import do app: env.ts e o client do db leem process.env no load.
config({ path: path.resolve(__dirname, '.env.test') });

jest.setTimeout(30000);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);

afterAll(async () => {
  const { disconnectDB } = await import('@infra/db');
  await disconnectDB();
});
