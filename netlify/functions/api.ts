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
import { netlifySecurityMiddleware } from "../../src/middlewares/security";
import router from "../../src/routes";

// Definir variável de ambiente para Netlify Functions
process.env.NETLIFY_FUNCTION = "true";

const app = express();

// Aplicar middlewares de segurança específicos para Netlify
netlifySecurityMiddleware(app);

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
    try {
      // Converter o evento do Netlify para uma requisição Express
      const req = {
        method: event.httpMethod,
        url: event.path,
        headers: event.headers || {},
        body: event.body,
        query: event.queryStringParameters || {},
        params: {},
        ip:
          event.headers?.["client-ip"] ||
          event.headers?.["x-forwarded-for"] ||
          "unknown",
        originalUrl: event.path,
        protocol: "https",
        secure: true,
        hostname: event.headers?.host || "localhost",
        path: event.path,
        setHeader: () => {},
        getHeader: (name: string) => event.headers?.[name.toLowerCase()],
        removeHeader: () => {},
      };

      const res = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        body: "",
        setHeader: (name: string, value: string) => {
          if (name && value) {
            res.headers[name] = value;
          }
        },
        getHeader: (name: string) => res.headers[name],
        removeHeader: (name: string) => {
          if (name && res.headers[name]) {
            delete res.headers[name];
          }
        },
        json: (data: any) => {
          res.body = JSON.stringify(data);
          res.headers["Content-Type"] = "application/json";
        },
        send: (data: any) => {
          res.body = typeof data === "string" ? data : JSON.stringify(data);
        },
        status: (code: number) => {
          res.statusCode = code;
          return res;
        },
        end: (data?: any) => {
          if (data) {
            res.body = typeof data === "string" ? data : JSON.stringify(data);
          }
        },
        write: (data: any) => {
          res.body += typeof data === "string" ? data : JSON.stringify(data);
        },
        writeHead: (statusCode: number, headers?: Record<string, string>) => {
          res.statusCode = statusCode;
          if (headers) {
            Object.assign(res.headers, headers);
          }
        },
      };

      // Simular o processamento da requisição
      app(req as any, res as any, (error?: any) => {
        if (error) {
          console.error("Express error:", error);
          resolve({
            statusCode: 500,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ error: "Internal Server Error" }),
          });
        } else {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: res.body,
          });
        }
      });
    } catch (error) {
      console.error("Handler error:", error);
      resolve({
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    }
  });
};

export { handler };
