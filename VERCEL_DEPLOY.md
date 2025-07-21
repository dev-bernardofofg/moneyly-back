# 🚀 Deploy na Vercel

## Configuração

O projeto está configurado para deploy na Vercel usando a abordagem de API Routes.

### Estrutura do Projeto

```
moneyly-back/
├── api/
│   └── index.ts          # API principal para Vercel
├── src/
│   ├── controllers/      # Controllers da aplicação
│   ├── services/         # Lógica de negócio
│   ├── repositories/     # Acesso a dados
│   ├── routes/           # Rotas da API
│   ├── middlewares/      # Middlewares
│   ├── schemas/          # Validações Zod
│   ├── db/               # Configuração do banco
│   └── server.ts         # Servidor Express (desenvolvimento)
├── vercel.json           # Configuração Vercel
└── package.json          # Dependências e scripts
```

### Variáveis de Ambiente

Configure as seguintes variáveis de ambiente na Vercel:

```env
# Banco de dados
DATABASE_URL=sua_url_do_banco

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret

# CORS (opcional)
ALLOWED_ORIGINS=https://seu-frontend.com,https://outro-dominio.com

# Rate Limiting (opcional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
REQUEST_TIMEOUT=30000
```

## Deploy

### 1. Via GitHub (Recomendado)

1. Conecte seu repositório GitHub à Vercel
2. Configure as variáveis de ambiente no painel da Vercel
3. Deploy automático será feito a cada push

### 2. Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel

# Deploy em produção
vercel --prod
```

## Endpoints da API

Após o deploy, seus endpoints estarão disponíveis em:
`https://seu-projeto.vercel.app/api/`

- `GET /api/health` - Health check
- `GET /api/transactions` - Listar transações
- `POST /api/transactions` - Criar transação
- `GET /api/categories` - Listar categorias
- `GET /api/overview` - Resumo financeiro
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/user/profile` - Perfil do usuário
- `GET /api/savings-goals` - Metas de economia
- `GET /api/category-budgets` - Orçamentos por categoria

## Troubleshooting

### Erro 404 (Not Found)

- Verifique se o arquivo `api/index.ts` existe
- Confirme que o `vercel.json` está configurado corretamente
- Teste o endpoint `/api/health` primeiro

### Erro de conexão com banco

- Verifique se `DATABASE_URL` está configurada
- Certifique-se que o banco aceita conexões externas
- Teste a conexão localmente primeiro

### Erro de CORS

- Configure `ALLOWED_ORIGINS` com os domínios corretos
- Verifique se o frontend está usando HTTPS

### Erro de build

- Execute `pnpm run build` localmente para verificar erros
- Verifique se todas as dependências estão instaladas
- Confirme que o TypeScript está compilando sem erros

## Teste Local

Para testar localmente antes do deploy:

```bash
# Instalar dependências
pnpm install

# Executar em desenvolvimento
pnpm run dev

# Testar endpoints
curl http://localhost:3000/api/health
```

## Logs e Debugging

- Use `console.log()` para debug (aparecerá nos logs da Vercel)
- Acesse os logs no painel da Vercel em "Functions" > "api/index.ts"
- Use o endpoint `/api/health` para verificar se a API está funcionando
