/**
 * Setup global para todos os testes
 */

import { config } from 'dotenv';
import path from 'path';

// 🔥 CARREGA .env.test ANTES DE QUALQUER COISA
config({ path: path.resolve(__dirname, '.env.test') });

// Aumentar timeout para testes de integração
jest.setTimeout(30000);

// Mock de variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Usa TEST_DATABASE_URL do .env.test, ou fallback para local
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/moneyly_test';

// Log para confirmar qual banco está sendo usado
console.log(
  '🗄️  Banco de teste:',
  process.env.DATABASE_URL?.split('@')[1]?.split('?')[0] || 'não configurado'
);
