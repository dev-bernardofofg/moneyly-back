/**
 * Recomeço dos dados financeiros de UM usuário (destrutivo).
 *
 * Uso: pnpm db:reset-user <email> [--confirm]
 * Sem --confirm só conta; nada é escrito. Faça backup antes de confirmar.
 */
import { and, eq, isNotNull, ne, or, sql } from 'drizzle-orm';
import { db, disconnectDB } from '@infra/db';
import {
  accounts,
  cardBillPayments,
  overtimeRecords,
  transactions,
  transfers,
  users,
} from '@infra/db/schema';

export interface ResetCounts {
  transactions: number;
  transfers: number;
  billPayments: number;
  overtimeLinks: number;
  accounts: number;
}

export async function resetUserFinancialData(
  email: string,
  options: { confirm: boolean }
): Promise<ResetCounts> {
  return db.transaction(async (tx) => {
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (!user) throw new Error(`Usuário não encontrado: ${email}`);
    const userId = user.id;

    const count = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;

    const hasAccountState = or(
      ne(accounts.openingBalance, 0),
      isNotNull(accounts.openingBalanceDate),
      isNotNull(accounts.dataThrough)
    );

    const counts: ResetCounts = {
      transactions: await count(
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(transactions)
          .where(eq(transactions.userId, userId))
      ),
      transfers: await count(
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(transfers)
          .where(eq(transfers.userId, userId))
      ),
      billPayments: await count(
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(cardBillPayments)
          .where(eq(cardBillPayments.userId, userId))
      ),
      overtimeLinks: await count(
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(overtimeRecords)
          .where(and(eq(overtimeRecords.userId, userId), isNotNull(overtimeRecords.transactionId)))
      ),
      accounts: await count(
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(accounts)
          .where(and(eq(accounts.userId, userId), hasAccountState))
      ),
    };

    if (!options.confirm) return counts;

    // Desvincula antes de apagar: a hora extra fica, a receita dela não.
    await tx
      .update(overtimeRecords)
      .set({ transactionId: null })
      .where(and(eq(overtimeRecords.userId, userId), isNotNull(overtimeRecords.transactionId)));
    await tx.delete(transactions).where(eq(transactions.userId, userId));
    await tx.delete(transfers).where(eq(transfers.userId, userId));
    await tx.delete(cardBillPayments).where(eq(cardBillPayments.userId, userId));
    // statement_key fica: reimportar precisa reconhecer as contas.
    await tx
      .update(accounts)
      .set({ openingBalance: 0, openingBalanceDate: null, dataThrough: null })
      .where(and(eq(accounts.userId, userId), hasAccountState));

    return counts;
  });
}

function describeTarget(): string {
  const url = new URL(process.env.DATABASE_URL ?? '');
  return `${url.host}${url.pathname}`;
}

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');
  const email = args.find((arg) => !arg.startsWith('--'));
  if (!email) throw new Error('Uso: pnpm db:reset-user <email> [--confirm]');

  console.log(`Banco: ${describeTarget()}`);
  const counts = await resetUserFinancialData(email, { confirm });
  console.log(`Transações: ${counts.transactions}`);
  console.log(`Transferências: ${counts.transfers}`);
  console.log(`Pagamentos de fatura: ${counts.billPayments}`);
  console.log(`Horas extras desvinculadas: ${counts.overtimeLinks}`);
  console.log(`Contas com saldo inicial/cobertura limpos: ${counts.accounts}`);
  console.log(
    confirm ? 'Dados removidos.' : 'Nada foi alterado. Rode com --confirm para apagar de fato.'
  );
}

// Importar o módulo (testes) não pode executar o script.
if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => disconnectDB());
}
