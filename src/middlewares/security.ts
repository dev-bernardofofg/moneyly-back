import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import helmet from "helmet";

// Rate limiting para endpoints de autenticação
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting geral para a API
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP
  message: {
    error: "Muitas requisições. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down para prevenir spam
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // permitir 50 requisições sem delay
  delayMs: () => 500, // adicionar 500ms de delay por requisição após o limite (nova sintaxe v2)
});

// Configuração CORS segura
export const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      // Adicione aqui os domínios de produção
      // 'https://seu-dominio.com'
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Não permitido pelo CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Middleware de segurança principal
export const securityMiddleware = (app: express.Application) => {
  // Headers de segurança com Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false, // Desabilitar se necessário para CORS
    })
  );

  // CORS configurado
  app.use(cors(corsOptions));

  // Rate limiting geral
  app.use(apiRateLimit);

  // Slow down
  app.use(speedLimiter);

  // Remover headers que podem expor informações
  app.disable("x-powered-by");

  // Configurar timeout para requisições
  app.use((req, res, next) => {
    req.setTimeout(30000); // 30 segundos
    res.setTimeout(30000);
    next();
  });
};
