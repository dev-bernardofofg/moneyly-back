import { config } from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV === "test") {
  config({ path: ".env.test" });
} else {
  config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().default(3333), // coerce nessa linha para padronizar independente do formato que recebermos ser convertido aqui
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

export const _env = envSchema.safeParse(process.env); // passando a tipagem

if (_env.success === false) {
  // validando se todos os envs propostos estão sendo utilizados
  console.error("Invalid environment variables!", _env.error.format());

  throw new Error("Invalid environment variables!");
}

export const env = _env.data; // incorporando a tipagem para o env, então no projeto invés de chamarmos process.env, chamaremos apenas env
