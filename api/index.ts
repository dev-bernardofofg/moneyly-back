import express from "express";
import { connectDB } from "../src/db";
import { errorHandler } from "../src/middlewares/errorHandler";
import { sanitizeData } from "../src/middlewares/sanitize";
import { securityMiddleware } from "../src/middlewares/security";
import router from "../src/routes";

const app = express();

// Aplicar middlewares de segurança
securityMiddleware(app);

// Parser de JSON
app.use(express.json({ limit: "10mb" }));

// Sanitização de dados
app.use(sanitizeData);

// Conectar ao banco de dados
connectDB();

// Rotas da aplicação
app.use(router);

// Global error handler
app.use(errorHandler);

// Exportar para Vercel
export default app;
