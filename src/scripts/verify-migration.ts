import { db } from "../db";
import { transactions, financialPeriods, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentFinancialPeriod } from "../helpers/financial-period";
import { toSaoPauloTimezone } from "../helpers/date-utils";

/**
 * Script para migrar transações existentes e adicionar periodId
 * Execute este script APÓS adicionar a coluna periodId na tabela transactions
 */
export async function migrateTransactionsPeriods() {
  console.log(" Iniciando migração de períodos para transações...");

  try {
    // 1. Buscar todas as transações sem periodId
    const transactionsWithoutPeriod = await db
      .select()
      .from(transactions)
      .where(eq(transactions.periodId, null));

    console.log(`📊 Encontradas ${transactionsWithoutPeriod.length} transações para migrar`);

    if (transactionsWithoutPeriod.length === 0) {
      console.log("✅ Nenhuma transação para migrar!");
      return;
    }

    // 2. Agrupar transações por usuário para otimizar
    const transactionsByUser = new Map<string, typeof transactionsWithoutPeriod>();
    
    for (const tx of transactionsWithoutPeriod) {
      if (!transactionsByUser.has(tx.userId)) {
        transactionsByUser.set(tx.userId, []);
      }
      transactionsByUser.get(tx.userId)!.push(tx);
    }

    console.log(`👥 Processando ${transactionsByUser.size} usuários`);

    // 3. Processar cada usuário
    for (const [userId, userTransactions] of transactionsByUser) {
      console.log(`\n👤 Processando usuário ${userId}...`);

      // Buscar configuração do usuário
      const user = await db
        .select({
          financialDayStart: users.financialDayStart,
          financialDayEnd: users.financialDayEnd,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        console.log(`⚠️ Usuário ${userId} não encontrado, pulando...`);
        continue;
      }

      const { financialDayStart, financialDayEnd } = user[0];
      const startDay = financialDayStart ?? 1;
      const endDay = financialDayEnd ?? 31;

      console.log(`📅 Configuração: dia ${startDay} a ${endDay}`);

      // 4. Processar cada transação do usuário
      for (const tx of userTransactions) {
        try {
          // Calcular período para a data da transação
          const transactionDate = toSaoPauloTimezone(tx.date);
          const period = getCurrentFinancialPeriod(
            startDay,
            endDay,
            transactionDate
          );

          // 5. Buscar ou criar período no banco
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

          if (existingPeriod.length > 0) {
            periodId = existingPeriod[0].id;
            console.log(`  ✅ Período existente encontrado: ${periodId}`);
          } else {
            // Criar novo período
            const [newPeriod] = await db
              .insert(financialPeriods)
              .values({
                userId,
                startDate: period.startDate,
                endDate: period.endDate,
                isActive: true,
              })
              .returning();

            periodId = newPeriod.id;
            console.log(`  🆕 Novo período criado: ${periodId}`);
          }

          // 6. Atualizar transação com periodId
          await db
            .update(transactions)
            .set({ periodId })
            .where(eq(transactions.id, tx.id));

          console.log(`  ✅ Transação ${tx.id} atualizada com período ${periodId}`);

        } catch (error) {
          console.error(`  ❌ Erro ao processar transação ${tx.id}:`, error);
        }
      }
    }

    console.log("\n Migração concluída com sucesso!");

  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrateTransactionsPeriods()
    .then(() => {
      console.log("✅ Script executado com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro no script:", error);
      process.exit(1);
    });
}
