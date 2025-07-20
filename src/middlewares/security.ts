import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import helmet from "helmet";
import { env } from "../env";

// Rate limiting para endpoints de autenticação
export const authRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 2000, // máximo 2000 tentativas por IP
  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting geral para a API
export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: {
    error: "Muitas requisições. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down para prevenir spam
export const speedLimiter = slowDown({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  delayAfter: 50, // permitir 50 requisições sem delay
  delayMs: () => 500, // adicionar 500ms de delay por requisição após o limite
});

// Configuração CORS segura
export const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      ...env.ALLOWED_ORIGINS,
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
    req.setTimeout(env.REQUEST_TIMEOUT);
    res.setTimeout(env.REQUEST_TIMEOUT);
    next();
  });
};

// Middleware de segurança para Netlify Functions (versão simplificada)
export const netlifySecurityMiddleware = (app: express.Application) => {
  // CORS configurado
  app.use(cors(corsOptions));

  // Rate limiting geral (desabilitado em ambiente serverless se necessário)
  if (!env.NETLIFY_FUNCTION) {
    app.use(apiRateLimit);
    app.use(speedLimiter);
  }

  // Remover headers que podem expor informações
  app.disable("x-powered-by");

  // Headers de segurança básicos (sem Helmet para evitar problemas no Netlify)
  app.use((req, res, next) => {
    try {
      // Headers de segurança básicos
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

      // Configurar timeout para requisições
      req.setTimeout(env.REQUEST_TIMEOUT);
      res.setTimeout(env.REQUEST_TIMEOUT);

      next();
    } catch (error) {
      console.error("Security middleware error:", error);
      next();
    }
  });
};
