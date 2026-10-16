/**
 * Script para configurar o banco de dados de teste
 *
 * Uso:
 *   pnpm test:db:setup
 */

import { config } from 'dotenv';
import path from 'path';

// Carrega .env.test
config({ path: path.resolve(__dirname, '../../.env.test') });

async function setupTestDatabase() {
  const testDbUrl = process.env.TEST_DATABASE_URL;

  if (!testDbUrl) {
    console.error('❌ TEST_DATABASE_URL não configurado no .env.test');
    process.exit(1);
  }

  console.log('\n🗄️  Configurando banco de teste...\n');

  // Extrai informações da URL
  const dbInfo = testDbUrl.split('@')[1]?.split('?')[0] || 'não disponível';
  console.log('📍 Banco:', dbInfo);

  console.log('\n✅ Configuração válida!');
  console.log('\n📝 Próximos passos:');
  console.log('   Execute: pnpm test:integration');
  console.log('   (Recria o schema e aplica as migrations antes de rodar)');
  console.log('\n💡 Dica: Os testes unitários NÃO usam banco de dados (só mocks)');
  console.log('         Os testes de integração USAM o banco de teste configurado');
  console.log('         Os testes E2E precisam do servidor rodando (pnpm dev)\n');
}

setupTestDatabase().catch((error) => {
  console.error('❌ Erro ao configurar banco de teste:', error);
  process.exit(1);
});
