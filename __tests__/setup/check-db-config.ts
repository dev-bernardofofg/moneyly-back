/**
 * Script para verificar qual banco de dados está configurado para testes
 */

import { config } from 'dotenv';
import path from 'path';

// Carrega .env.test
config({ path: path.resolve(__dirname, '../../.env.test') });

console.log('\n🔍 VERIFICAÇÃO DE CONFIGURAÇÃO DE BANCO\n');
console.log('='.repeat(60));

const testDbUrl = process.env.TEST_DATABASE_URL;
const devDbUrl = process.env.DATABASE_URL;

console.log('\n📁 Arquivo .env.test:');
console.log('   TEST_DATABASE_URL:', testDbUrl ? '✅ Configurado' : '❌ NÃO configurado');

if (testDbUrl) {
  const testDbInfo = testDbUrl.split('@')[1]?.split('?')[0] || 'não disponível';
  console.log('   Banco de teste:', testDbInfo);
  console.log('   ');

  // Extrai partes importantes
  const testMatch = testDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (testMatch) {
    console.log('   🔑 User:', testMatch[1]);
    console.log('   🌐 Host:', testMatch[3]);
    console.log('   📦 Database:', testMatch[4]);
  }
}

console.log('\n📁 Variável DATABASE_URL (dev):');
if (devDbUrl) {
  const devDbInfo = devDbUrl.split('@')[1]?.split('?')[0] || 'não disponível';
  console.log('   Banco de dev:', devDbInfo);
} else {
  console.log('   ⚪ Não carregado (normal em testes)');
}

console.log('\n' + '='.repeat(60));

// Comparação
if (testDbUrl && devDbUrl && testDbUrl !== devDbUrl) {
  console.log('\n✅ TUDO CERTO!');
  console.log('   Os bancos de teste e desenvolvimento são DIFERENTES.');
  console.log('   Seus testes NÃO vão afetar o banco de desenvolvimento!');
} else if (testDbUrl && !devDbUrl) {
  console.log('\n✅ TUDO CERTO!');
  console.log('   Apenas o banco de teste está configurado.');
  console.log('   Seus testes usarão o banco de teste isolado!');
} else if (testDbUrl === devDbUrl) {
  console.log('\n⚠️ ATENÇÃO!');
  console.log('   O banco de teste e dev são o MESMO!');
  console.log('   Isso pode causar problemas!');
} else {
  console.log('\n❌ PROBLEMA!');
  console.log('   TEST_DATABASE_URL não está configurado!');
}

console.log('\n');

// Simular o que Jest faz
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDbUrl || 'postgresql://test:test@localhost:5432/moneyly_test';

console.log('🧪 Quando Jest roda, ele define:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DATABASE_URL será:', process.env.DATABASE_URL.split('@')[1]?.split('?')[0]);

console.log('\n');
