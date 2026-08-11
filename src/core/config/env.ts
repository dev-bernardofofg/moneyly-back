import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

// Validação das variáveis obrigatórias (sempre, sem fallback inseguro)
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'] as const;
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não encontradas:', missingEnvVars);
  if (NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Configuração das variáveis de ambiente
export const env = {
  // Configurações do servidor
  PORT: process.env.PORT || 3000,
  NODE_ENV,

  // Configurações do banco de dados
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Configurações JWT
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Configurações do Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  // Firebase Admin (push notifications) — opcional: sem isso o app roda
  // normalmente, só não envia push. A chave privada vem do JSON da service
  // account, com as quebras de linha escapadas como \n no .env.
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),

  // Configurações de CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5000', 'http://localhost:3000'],

  // Configurações de rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),

  // Configurações de timeout
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '30000'), // 30 segundos
};

// Log das configurações (sem dados sensíveis)
console.log('🔧 Configurações carregadas:', {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,
  ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
  DATABASE_URL: env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado',
  JWT_SECRET: env.JWT_SECRET ? '✅ Configurado' : '❌ Não configurado',
  GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ Não configurado',
  FIREBASE: env.FIREBASE_PROJECT_ID ? '✅ Configurado' : '⚠️ Push desabilitado',
});
