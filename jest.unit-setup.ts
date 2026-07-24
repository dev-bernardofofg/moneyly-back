/**
 * Setup dos testes unitários — 100% em memória.
 * Sem banco: repositórios/serviços singletons são mockados via jest.mock nos testes.
 * DATABASE_URL dummy garante que qualquer query acidental falhe em vez de tocar banco real.
 */

jest.setTimeout(10000);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';
