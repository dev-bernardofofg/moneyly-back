import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

// Configuração da conexão com PostgreSQL
const connectionString = env.DATABASE_URL!;

// Cliente PostgreSQL
const client = postgres(connectionString);

// Instância do Drizzle ORM
export const db = drizzle(client, { schema });

// Função para conectar ao banco
export const connectDB = async () => {
  try {
    // Testar a conexão
    await client`SELECT 1`;
    console.log("PostgreSQL conectado com sucesso");
  } catch (err) {
    console.error("Erro ao conectar com PostgreSQL:", err);
    process.exit(1);
  }
};

// Função para desconectar do banco
export const disconnectDB = async () => {
  await client.end();
  console.log("Conexão com PostgreSQL fechada");
};
