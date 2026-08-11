# 💰 Moneyly API

API REST para gerenciamento financeiro pessoal com TypeScript, Express e PostgreSQL.

## 🚀 Stack Tecnológica

- **Node.js** + **TypeScript**
- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **Drizzle ORM** - ORM TypeScript-first
- **Zod** - Validação de schemas
- **JWT** - Autenticação
- **Jest** - Testes unitários e integração
- **Playwright** - Testes E2E
- **Swagger/OpenAPI** - Documentação da API
- **Kubb** - Geração automática de tipos TypeScript e Zod
- **Orval** - Geração automática de hooks React Query

## 📦 Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env

# Criar e migrar banco de dados
pnpm db:push

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
pnpm db:push            # Push schema para o banco
pnpm db:studio          # Abre Drizzle Studio
pnpm restore:categories # Restaura categorias padrão
```

### API & Geração de Código

```bash
pnpm api:generate       # Gera tipos TS, Zod e hooks React Query
pnpm dev                # Inicia servidor + Swagger UI em /api-docs
```

### Testes

```bash
pnpm test               # Roda todos os testes
pnpm test:unit          # Testes unitários
pnpm test:integration   # Testes de integração
pnpm test:e2e           # Testes E2E com Playwright
pnpm test:coverage      # Cobertura de código
pnpm test:watch         # Testes em modo watch
```

## 📚 Documentação

### Swagger UI

Acesse a documentação interativa da API:

```
http://localhost:5000/api-docs
```

### Geração Automática para Frontend

Gera **tipos**, **validações** e **hooks** automaticamente:

```bash
pnpm api:generate
```

Gerado em `src/generated/`:

- **TypeScript Types** (`types/`) - Kubb
- **Zod Schemas** (`zod/`) - Kubb
- **React Query Hooks** (`hooks/`) - Orval

**Frontend usa direto:**

```typescript
import { usePostTransactionsCreate } from '@/generated/hooks/transactions/transactions';

const { mutate } = usePostTransactionsCreate();
// Pronto! Hook com tipagem e validação automática!
```

## 🏗️ Arquitetura

```
src/
├── controllers/      # Controladores HTTP
├── services/         # Lógica de negócio
├── repositories/     # Acesso a dados
├── middlewares/      # Middlewares Express
├── schemas/          # Schemas Zod
├── validations/      # Validações customizadas
├── routes/           # Definição de rotas
├── helpers/          # Funções auxiliares
├── db/               # Configuração do banco
├── lib/              # Utilitários
└── generated/        # ⚡ Gerado automaticamente
    ├── types/        #   ├─ Tipos TS (Kubb)
    ├── zod/          #   ├─ Schemas Zod (Kubb)
    └── hooks/        #   └─ Hooks React Query (Orval)

openapi.json          # Especificação OpenAPI
kubb.config.ts        # Config do Kubb
orval.config.ts       # Config do Orval
```

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

# Firebase Admin — push notifications (opcional).
# Sem essas variáveis a API sobe normal: as notificações continuam sendo
# criadas no banco, só não saem como push.
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 🧪 Testes

### Cobertura de Testes

- ✅ **195 testes unitários** - Services e Helpers
- ✅ **86 testes de integração** - Endpoints da API
- ✅ **31 testes E2E** - Fluxos completos com Playwright

### Executar Testes

```bash
# Todos os testes
pnpm test

# Por tipo
pnpm test:unit           # Unitários
pnpm test:integration    # Integração
pnpm test:e2e           # E2E com Playwright

# Com cobertura
pnpm test:coverage

# Em modo watch
pnpm test:watch
```

Consulte `__tests__/README.md` para mais informações sobre os testes.

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
