import type { Application } from "express";
import express from "express";
import { connectDB } from "./db";
import { env } from "./env";
import { errorHandler } from "./middlewares/errorHandler";
import { sanitizeData } from "./middlewares/sanitize";
import { securityMiddleware } from "./middlewares/security";
import router from "./routes";

const app: Application = express();

// Aplicar middlewares de segurança
securityMiddleware(app);

// Parser de JSON
app.use(express.json({ limit: "10mb" })); // Limitar tamanho do payload

// Sanitização de dados
app.use(sanitizeData);

connectDB();

app.use(router);

// Global error handler - deve ser o último middleware
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Servidor rodando na porta ${env.PORT}`);
});
