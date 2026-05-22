/**
 * Baseline do tracking de migrations (one-off, idempotente).
 *
 * Contexto: o schema foi historicamente aplicado via `drizzle-kit push`,
 * então `drizzle.__drizzle_migrations` ficou vazio. `db:migrate` então
 * tenta replayar 0000..N e colide ("relation already exists").
 *
 * Este script marca as migrations já existentes (journal) como aplicadas,
 * usando o MESMO hash que o drizzle calcula (sha256 do .sql) e
 * created_at = journal.when. Não roda SQL de schema; só insere bookkeeping.
 * Idempotente: pula hashes já registrados.
 *
 * Uso: tsx src/scripts/baseline-migrations.ts
 */
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import 'dotenv/config';

const MIGRATIONS_DIR = join(__dirname, '../db/migrations');

interface JournalEntry {
  tag: string;
  when: number;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL ausente');

  const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf-8')) as {
    entries: JournalEntry[];
  };

  const sql = postgres(url, { max: 1 });
  try {
    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    const existing = await sql<{ hash: string }[]>`
      SELECT hash FROM drizzle.__drizzle_migrations
    `;
    const known = new Set(existing.map((r) => r.hash));

    let inserted = 0;
    for (const entry of journal.entries) {
      const content = readFileSync(join(MIGRATIONS_DIR, `${entry.tag}.sql`), 'utf-8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      if (known.has(hash)) {
        console.log(`skip ${entry.tag} (já registrada)`);
        continue;
      }
      await sql`
        INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
        VALUES (${hash}, ${entry.when})
      `;
      inserted++;
      console.log(`baseline ${entry.tag}`);
    }
    console.log(`OK — ${inserted} migration(s) registradas, ${journal.entries.length} no journal`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
