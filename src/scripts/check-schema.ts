import { eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { transactions } from "../db/schema";

export async function checkSchema() {
  console.log(" Verificando schema da tabela transactions...");

  try {
    // Buscar todas as transações
    const allTransactions = await db
      .select({
        id: transactions.id,
        periodId: transactions.periodId,
        date: transactions.date,
        userId: transactions.userId,
      })
      .from(transactions)
      .limit(5);

    console.log("📊 Primeiras 5 transações:");
    console.log(JSON.stringify(allTransactions, null, 2));

    // Verificar se periodId existe
    const hasPeriodId = 'periodId' in allTransactions[0];
    console.log(`\n🔍 Campo periodId existe? ${hasPeriodId}`);

    // Contar transações com e sem periodId
    const totalTransactions = await db
      .select({ count: transactions.id })
      .from(transactions);

    console.log(`\n📊 Total de transações: ${totalTransactions.length}`);

    if (hasPeriodId) {
      const withPeriodId = await db
        .select({ count: transactions.id })
        .from(transactions)
        .where(eq(transactions.periodId, null));

      const withoutPeriodId = await db
        .select({ count: transactions.id })
        .from(transactions)
        .where(isNull(transactions.periodId));

      console.log(`📊 Transações com periodId null: ${withPeriodId.length}`);
      console.log(`📊 Transações com periodId undefined: ${withoutPeriodId.length}`);
    }

  } catch (error) {
    console.error("❌ Erro ao verificar schema:", error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkSchema()
    .then(() => {
      console.log("✅ Verificação concluída!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro na verificação:", error);
      process.exit(1);
    });
}
