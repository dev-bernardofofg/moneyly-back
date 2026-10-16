import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import postgres from 'postgres';
import { assertTestDatabaseUrl } from './__tests__/setup/assert-test-database';

export default async () => {
  config({ path: path.resolve(__dirname, '.env.test') });

  const url = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const client = postgres(url, { max: 1, onnotice: () => {} });

  try {
    // Recria do zero: banco previsível e migrations aplicadas como em produção.
    await client.unsafe(`
      DROP SCHEMA IF EXISTS drizzle CASCADE;
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
    `);
    await migrate(drizzle(client), {
      migrationsFolder: path.resolve(__dirname, 'src/infra/db/migrations'),
    });
  } finally {
    await client.end();
  }
};
