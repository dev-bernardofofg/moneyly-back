# Moneyly API — salário sob controle

API REST do copiloto financeiro Moneyly, voltado a pessoas com salário fixo e renda
variável. O núcleo calcula quanto está livre para gastar em cada período financeiro depois
de considerar movimentações realizadas, recorrências, orçamento, metas e horas extras.

## Conceito central

`GET /overview/forecast` retorna, além do saldo projetado, o **Saldo Livre**:

`saldo realizado + entradas futuras - contas futuras - reservas do ciclo`

O detalhamento informa renda fixa e variável, compromissos, reservas, dias restantes e
confiança da projeção. Horas extras continuam sendo registradas pelo módulo próprio, mas
são tratadas como uma fonte de renda variável integrada às transações.

## 🚀 Stack Tecnológica

- **Node.js** + **TypeScript**
- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **Drizzle ORM** - ORM TypeScript-first
- **Zod** - Validação de schemas
- **JWT** - Autenticação
- **Jest** - Testes unitários e integração (Postgres em Docker)
- **OpenAPI** - `openapi.json` gerado do código (zod-to-openapi); Swagger UI em `/api-docs`

## 📦 Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env

# Aplicar migrations
pnpm db:migrate

# Restaurar categorias padrão
pnpm restore:categories

# Iniciar servidor de desenvolvimento
pnpm dev
```

## 🔧 Scripts Disponíveis

### Desenvolvimento

```bash
pnpm dev                # Inicia servidor com hot reload
pnpm build              # Build para produção
pnpm start              # Inicia servidor em produção
```

### Banco de Dados

```bash
pnpm db:generate        # Gera migrations
pnpm db:migrate         # Executa migrations
pnpm db:baseline        # Marca migrations já aplicadas (1x em banco criado via push)
pnpm db:studio          # Abre Drizzle Studio
pnpm restore:categories # Restaura categorias padrão
```

### API

```bash
pnpm openapi:gen        # Regenera openapi.json a partir dos schemas Zod
pnpm typecheck          # tsc --noEmit
```

### Testes

```bash
pnpm test               # Roda todos os testes
pnpm test:unit          # Testes unitários
pnpm test:integration   # Testes de integração
pnpm test:coverage      # Cobertura de código
pnpm test:watch         # Testes em modo watch
```

## 📚 Documentação

### Swagger UI

Acesse a documentação interativa da API:

```
http://localhost:5000/api-docs
```

### Contrato para o frontend

O `moneyly-front` gera tipos (Kubb) e hooks React Query (Orval) lendo
`../moneyly-back/openapi.json`. Mudou endpoint ou payload: `pnpm openapi:gen` aqui e
`pnpm generate-hooks` lá. Protocolo em `../.specs/04-sync-protocol.md`.

## 🏗️ Arquitetura

Module-first (detalhes em `.specs/06-project-structure.md`):

```
src/
├── core/            # transversal: config, middlewares, helpers, errors, openapi (nunca importa modules/)
├── infra/db/        # schema Drizzle, migrations, conexão
├── modules/<x>/     # router → controller → use-cases → repositories; schemas Zod; <x>.paths.ts (openapi)
├── jobs/            # jobs agendados (Vercel Cron em produção, setInterval local)
├── routes.ts        # agrega os routers
└── server.ts        # entrypoint local
api/index.js         # entrypoint Vercel (requer dist/)
```

Fluxo de um request: `Router → authenticateUser → ensurePeriodExists → validate → Controller → Use-case → Repository`.

## 🔐 Variáveis de Ambiente

```env
# Servidor
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5000

# Banco de Dados
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your-secret-key

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=your-google-client-id

# Vercel Cron — protege GET /internal/cron/daily (gerar com: openssl rand -hex 32)
CRON_SECRET=

# Firebase Admin — push notifications (opcional).
# Sem essas variáveis a API sobe normal: as notificações continuam sendo
# criadas no banco, só não saem como push.
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 🧪 Testes

Unitários (use-cases e helpers, sem banco) e de integração (HTTP real contra um Postgres de
teste em Docker, schema recriado a cada execução).

```bash
docker run -d --name moneyly-test-db --restart unless-stopped \
  -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=moneyly_test \
  -p 5433:5432 postgres:16-alpine

pnpm test:unit
pnpm test:integration
pnpm test:coverage
```

Detalhes e convenções em `__tests__/README.md`.

## 📊 Endpoints Principais

### Autenticação

- `POST /auth/sign-up` - Cadastro
- `POST /auth/sign-in` - Login
- `POST /auth/google` - Login com Google

### Transações

- `POST /transactions/create` - Criar transação
- `POST /transactions/` - Listar transações (paginado)
- `PUT /transactions/:id` - Atualizar transação
- `DELETE /transactions/:id` - Deletar transação
- `GET /transactions/summary` - Resumo financeiro
- `GET /transactions/summary-current-period` - Resumo do período atual

### Orçamentos

- `POST /budgets/` - Criar orçamento
- `GET /budgets/` - Listar orçamentos
- `PUT /budgets/:id` - Atualizar orçamento
- `DELETE /budgets/:id` - Deletar orçamento

### Metas de Poupança

- `POST /goals/` - Criar meta
- `GET /goals/` - Listar metas
- `GET /goals/:id` - Detalhes da meta
- `PUT /goals/:id` - Atualizar meta
- `POST /goals/:id/add-amount` - Adicionar valor à meta
- `DELETE /goals/:id` - Deletar meta

### Categorias

- `GET /categories/` - Listar categorias
- `POST /categories/create` - Criar categoria customizada
- `PUT /categories/:id` - Atualizar categoria
- `DELETE /categories/:id` - Deletar categoria

### Overview/Dashboard

- `POST /overview/periods` - Períodos financeiros disponíveis
- `POST /overview/dashboard` - Dados do dashboard
- `GET /overview/planner` - Planejamento financeiro

## 🛡️ Segurança

- ✅ Helmet.js - Headers de segurança
- ✅ CORS configurado
- ✅ Rate limiting
- ✅ Sanitização de inputs
- ✅ JWT para autenticação
- ✅ Validação com Zod em todos os endpoints
- ✅ Error handling global

## 📄 Licença

ISC

## 👥 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### Padrões de Commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Apenas documentação
- `refactor:` - Refatoração de código
- `test:` - Adição de testes
- `chore:` - Tarefas de manutenção
