import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { env } from '../env';

// Rate limiting para endpoints de autenticação
export const authRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 10,
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting geral para a API
export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
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

type CorsCallback = (err: Error | null, allow?: boolean) => void;

// Configuração CORS segura
export const corsOptions = {
  origin: function (origin: string | undefined, callback: CorsCallback) {
    // Sem origin: aceitar apenas fora de produção (Postman, curl em dev)
    if (!origin) {
      if (env.NODE_ENV !== 'production') return callback(null, true);
      return callback(new Error('Origin obrigatório'));
    }

    if (env.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
          imgSrc: ["'self'", 'data:', 'https:'],
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
  app.disable('x-powered-by');

  // Configurar timeout para requisições
  app.use((req, res, next) => {
    req.setTimeout(env.REQUEST_TIMEOUT);
    res.setTimeout(env.REQUEST_TIMEOUT);
    next();
  });
};
