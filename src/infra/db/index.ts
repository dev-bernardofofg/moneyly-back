import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@core/config/env';
import { logger } from '@core/lib/logger';
import * as schema from './schema';

// Configuração da conexão com PostgreSQL
const connectionString = env.DATABASE_URL!;

// Serverless congela a instância entre requisições: conexão ociosa ou pela metade
// morre no freeze. Fechar ociosas cedo evita reaproveitar socket morto.
const client = postgres(connectionString, {
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 10,
});

// Instância do Drizzle ORM
export const db = drizzle(client, { schema });

// Checagem de conexão para processos de longa duração; postgres.js conecta sob demanda.
export const connectDB = async () => {
  try {
    await client`SELECT 1`;
    logger.info('PostgreSQL conectado com sucesso');
  } catch (err) {
    logger.error('Erro ao conectar com PostgreSQL', err as Error);
    throw err;
  }
};

export const disconnectDB = async () => {
  await client.end();
  logger.info('Conexão com PostgreSQL fechada');
};
