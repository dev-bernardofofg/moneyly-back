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
  console.log('   1. Execute: pnpm test:db:push');
  console.log('      (Para criar as tabelas no banco de teste)');
  console.log('\n   2. Execute: pnpm test:integration');
  console.log('      (Para rodar os testes de integração)');
  console.log('\n💡 Dica: Os testes unitários NÃO usam banco de dados (só mocks)');
  console.log('         Os testes de integração USAM o banco de teste configurado');
  console.log('         Os testes E2E precisam do servidor rodando (pnpm dev)\n');
}

setupTestDatabase().catch((error) => {
  console.error('❌ Erro ao configurar banco de teste:', error);
  process.exit(1);
});
