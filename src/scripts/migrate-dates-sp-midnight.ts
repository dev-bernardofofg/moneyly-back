/**
 * Migração pontual: canoniza datas dia-semânticas na meia-noite de São Paulo.
 *
 * Contexto: o write path antigo persistia `toZonedTime(...)` (wall-clock
 * deslocado), gerando epochs -3h/-6h conforme o caminho. O contrato novo
 * (.specs/02 §Datas) fixa: transactions.date / recurring.startDate /
 * recurring.nextExecution / goals.targetDate = meia-noite SP do dia exibido.
 *
 * Regra: nova data = spMidnight(dia SP que a linha JÁ exibe hoje) — preserva
 * exatamente o que o usuário vê no app. Transações de overtime (hora real)
 * ficam intactas.
 *
 * Uso:
 *   pnpm tsx src/scripts/migrate-dates-sp-midnight.ts --dry-run   # só relata
 *   pnpm tsx src/scripts/migrate-dates-sp-midnight.ts --apply     # aplica
 *   DATABASE_URL define o alvo (dev/test/prod).
 */

import { config } from 'dotenv';
import postgres from 'postgres';
import { spMidnight } from '@core/helpers/dates';

config();

const MODE = process.argv.includes('--apply')
  ? 'apply'
  : process.argv.includes('--dry-run')
    ? 'dry-run'
    : null;

if (!MODE) {
  console.error('Uso: tsx migrate-dates-sp-midnight.ts --dry-run | --apply');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não configurada.');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

interface DateRow {
  id: string;
  literal: string;
}

/**
 * Colunas são `timestamp` NAIVE e o app (drizzle) as interpreta como UTC.
 * Lente única: ler o literal via ::text e tratar como UTC; gravar o literal
 * UTC do instante-alvo (sem offset) — round-trip simétrico com o app.
 */
const appInstant = (literal: string): Date => new Date(literal.replace(' ', 'T') + 'Z');
// ISO com 'Z': parse não-ambíguo no driver (string sem offset seria lida como local).
const toWireValue = (instant: Date): string => instant.toISOString();

async function migrateColumn(
  table: string,
  column: string,
  where: string
): Promise<{ scanned: number; changed: number }> {
  const rows = await sql.unsafe<DateRow[]>(
    `SELECT id, ${column}::text AS literal FROM ${table} WHERE ${where}`
  );

  let changed = 0;
  const updates: { id: string; literal: string }[] = [];

  for (const row of rows) {
    const current = appInstant(row.literal);
    // Literal à meia-noite UTC = artefato de input date-only (`new Date('yyyy-MM-dd')`):
    // o dia-intenção é a PARTE-DATA do literal (o dia SP do instante cairia na véspera).
    const target = row.literal.endsWith('00:00:00')
      ? spMidnight(row.literal.slice(0, 10))
      : spMidnight(current);
    if (target.getTime() !== current.getTime()) {
      changed++;
      updates.push({ id: row.id, literal: toWireValue(target) });
    }
  }

  if (MODE === 'apply' && updates.length > 0) {
    for (const u of updates) {
      await sql.unsafe(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [u.literal, u.id]);
    }
  }

  return { scanned: rows.length, changed };
}

(async () => {
  const host = url.split('@')[1]?.split('/')[0] ?? '???';
  console.log(`\n[migrate-dates] modo=${MODE} alvo=${host}\n`);

  const results = [
    [
      'transactions.date (não-overtime)',
      await migrateColumn('transactions', 'date', 'overtime_record_id IS NULL'),
    ],
    [
      'recurring_transactions.start_date',
      await migrateColumn('recurring_transactions', 'start_date', 'TRUE'),
    ],
    [
      'recurring_transactions.next_execution',
      await migrateColumn('recurring_transactions', 'next_execution', 'TRUE'),
    ],
    ['goals.target_date', await migrateColumn('goals', 'target_date', 'TRUE')],
  ] as const;

  for (const [label, r] of results) {
    console.log(
      `${MODE === 'apply' ? 'ATUALIZADO' : 'MUDARIA'} ${label}: ${r.changed}/${r.scanned}`
    );
  }

  // Sanidade: literal naive-UTC deve cair na meia-noite SP (00:00 hora SP).
  const [{ off }] = await sql<{ off: string }[]>`
    SELECT count(*) AS off FROM transactions
    WHERE overtime_record_id IS NULL
      AND ((date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::time <> '00:00:00'
  `;
  console.log(`\nSanidade transactions fora do contrato: ${off}`);

  await sql.end();
})();
