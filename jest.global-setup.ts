/**
 * Setup global que roda uma vez antes de todos os testes
 */

import { exec } from "child_process";
import { config } from "dotenv";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async () => {
  console.log("\n🧪 Configurando ambiente de testes...\n");

  // IMPORTANTE: Carregar .env.test ANTES de fazer o push do schema
  config({ path: path.resolve(__dirname, ".env.test") });

  // Configurar DATABASE_URL para usar TEST_DATABASE_URL
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    "postgresql://test:test@localhost:5432/moneyly_test";

  console.log(
    "🗄️  Banco de teste:",
    process.env.DATABASE_URL?.split("@")[1]?.split("?")[0] || "não configurado"
  );

  try {
    // Fazer push do schema para o banco de testes
    console.log("🔧 Criando tabelas no banco de testes...");
    await execAsync("pnpm test:db:push");
    console.log("✅ Tabelas criadas com sucesso!\n");
  } catch (error) {
    console.error("❌ Erro ao configurar banco de testes:", error);
    throw error;
  }
};
