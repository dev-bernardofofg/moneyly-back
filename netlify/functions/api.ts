import {
  Handler,
  HandlerContext,
  HandlerEvent,
  HandlerResponse,
} from "@netlify/functions";
import express from "express";
import { connectDB } from "../../src/db";
import { errorHandler } from "../../src/middlewares/errorHandler";
import { sanitizeData } from "../../src/middlewares/sanitize";
import { securityMiddleware } from "../../src/middlewares/security";
import router from "../../src/routes";

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

// Handler para o Netlify Functions
const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  return new Promise((resolve, reject) => {
    // Converter o evento do Netlify para uma requisição Express
    const req = {
      method: event.httpMethod,
      url: event.path,
      headers: event.headers,
      body: event.body,
      query: event.queryStringParameters || {},
    };

    const res = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: "",
      setHeader: (name: string, value: string) => {
        res.headers[name] = value;
      },
      json: (data: any) => {
        res.body = JSON.stringify(data);
        res.headers["Content-Type"] = "application/json";
      },
      send: (data: any) => {
        res.body = typeof data === "string" ? data : JSON.stringify(data);
      },
    };

    // Simular o processamento da requisição
    app(req as any, res as any, () => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body,
      });
    });
  });
};

export { handler };
