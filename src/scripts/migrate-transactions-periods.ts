import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { financialPeriods, transactions, users } from '../db/schema';
import type { Transaction } from '../db/schema';
import { toSaoPauloTimezone } from '../helpers/dates';
import { getCurrentFinancialPeriod } from '../helpers/financial-period';

export async function migrateTransactionsPeriods() {
  console.log(' Iniciando migração de períodos para transações...');

  try {
    const sampleTransaction = await db.select().from(transactions).limit(1);

    if (sampleTransaction.length === 0 || !sampleTransaction[0]) {
      console.log('❌ Nenhuma transação encontrada na tabela!');
      return;
    }

    const hasPeriodId = 'periodId' in sampleTransaction[0];
    console.log(`🔍 Campo periodId existe? ${hasPeriodId}`);

    if (!hasPeriodId) {
      console.log('❌ Coluna periodId não existe! Execute a migração do banco primeiro.');
      return;
    }

    let transactionsToMigrate: Transaction[] = [];

    try {
      const nullPeriods = await db.select().from(transactions).where(isNull(transactions.periodId));

      console.log(`📊 Transações com periodId = null: ${nullPeriods.length}`);
      transactionsToMigrate.push(...nullPeriods);
    } catch (error) {
      console.log('⚠️ Erro ao buscar por periodId = null:', error);
    }

    try {
      const undefinedPeriods = await db
        .select()
        .from(transactions)
        .where(isNull(transactions.periodId));

      console.log(`📊 Transações com periodId undefined: ${undefinedPeriods.length}`);
      transactionsToMigrate.push(...undefinedPeriods);
    } catch (error) {
      console.log('⚠️ Erro ao buscar por periodId undefined:', error);
    }

    if (transactionsToMigrate.length === 0) {
      console.log('🔍 Buscando todas as transações...');
      const allTransactions = await db.select().from(transactions);

      transactionsToMigrate = allTransactions.filter(
        (tx) => !tx.periodId || tx.periodId === null || tx.periodId === undefined
      );

      console.log(`📊 Total de transações: ${allTransactions.length}`);
      console.log(`📊 Transações sem período: ${transactionsToMigrate.length}`);
    }

    const uniqueTransactions = transactionsToMigrate.filter(
      (tx, index, self) => index === self.findIndex((t) => t.id === tx.id)
    );

    console.log(`📊 Transações únicas para migrar: ${uniqueTransactions.length}`);

    if (uniqueTransactions.length === 0) {
      console.log('✅ Nenhuma transação para migrar!');
      return;
    }

    const transactionsByUser = new Map<string, typeof uniqueTransactions>();

    for (const tx of uniqueTransactions) {
      if (!transactionsByUser.has(tx.userId)) {
        transactionsByUser.set(tx.userId, []);
      }
      transactionsByUser.get(tx.userId)!.push(tx);
    }

    console.log(`👥 Processando ${transactionsByUser.size} usuários`);

    for (const [userId, userTransactions] of transactionsByUser) {
      console.log(`\n👤 Processando usuário ${userId}...`);

      const user = await db
        .select({
          financialDayStart: users.financialDayStart,
          financialDayEnd: users.financialDayEnd,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length || !user[0]) {
        console.log(`⚠️ Usuário ${userId} não encontrado, pulando...`);
        continue;
      }

      const { financialDayStart, financialDayEnd } = user[0];
      const startDay = financialDayStart ?? 1;
      const endDay = financialDayEnd ?? 31;

      console.log(`📅 Configuração: dia ${startDay} a ${endDay}`);

      for (const tx of userTransactions) {
        try {
          const transactionDate = toSaoPauloTimezone(tx.date);
          const period = getCurrentFinancialPeriod(startDay, endDay, transactionDate);

          const existingPeriod = await db
            .select()
            .from(financialPeriods)
            .where(
              and(
                eq(financialPeriods.userId, userId),
                eq(financialPeriods.startDate, period.startDate),
                eq(financialPeriods.endDate, period.endDate)
              )
            )
            .limit(1);

          let periodId: string;

          if (existingPeriod.length > 0 && existingPeriod[0]) {
            periodId = existingPeriod[0].id;
            console.log(`  ✅ Período existente encontrado: ${periodId}`);
          } else {
            const [newPeriod] = await db
              .insert(financialPeriods)
              .values({
                userId,
                startDate: period.startDate,
                endDate: period.endDate,
                isActive: true,
              })
              .returning();

            if (!newPeriod) throw new Error('Falha ao criar período');
            periodId = newPeriod.id;
            console.log(`  🆕 Novo período criado: ${periodId}`);
          }

          await db.update(transactions).set({ periodId }).where(eq(transactions.id, tx.id));

          console.log(`  ✅ Transação ${tx.id} atualizada com período ${periodId}`);
        } catch (error) {
          console.error(`  ❌ Erro ao processar transação ${tx.id}:`, error);
        }
      }
    }

    console.log('\n Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateTransactionsPeriods()
    .then(() => {
      console.log('✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error);
      process.exit(1);
    });
}
