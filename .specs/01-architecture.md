# 01 — Arquitetura

> **✅ Estrutura modular concluída** (base serverJB — ver `06-project-structure.md`).
> Todo domínio vive em `src/modules/<x>/`; transversal em `src/core/`; DB em `src/infra/db/`.
> Pendências registradas em `06`: split do overview.service em use-cases; aliases `@core/@modules/@infra`.

## Stack

- **Runtime:** Node.js + TypeScript (`tsc` build, `ts-node-dev` dev)
- **Web:** Express 4
- **DB:** PostgreSQL via **Drizzle ORM** (`postgres` driver)
- **Validação:** Zod 3
- **Auth:** JWT (access + refresh token), Google OAuth opcional
- **Testes:** Jest (unit + integração contra Postgres em Docker)
- **Docs:** OpenAPI/Swagger em `/api-docs` (lê `openapi.json` da raiz)
- **Contrato:** `pnpm openapi:gen` gera `openapi.json`; o front gera tipos/hooks a partir dele (ver `../../.specs/04-sync-protocol.md`)
- **Deploy:** Vercel (`api/index.js` requer `dist/src/server`; `src/server.ts` é o entrypoint local). Jobs via Vercel Cron (`vercel.json` → `GET /internal/cron/daily`)
- **Package manager:** pnpm

## Camadas (fluxo de um request)

```
Router (src/modules/<x>/<x>.router.ts)
  → middlewares: authenticateUser (modules/auth) → ensurePeriodExists (modules/financial-period) → validate*
  → Controller (modules/<x>/<x>.controller.ts)      # só HTTP, chama 1 use-case
  → Use-Case (modules/<x>/use-cases/*.use-case.ts)  # 1 operação de negócio por arquivo
  → Repository (modules/<x>/repositories/)          # Drizzle, satisfies I*Repository (interface no módulo)
  → DB (src/infra/db/schema.ts)
```

Resposta sempre via `ResponseHandler` (`src/core/helpers/response-handler.ts`).
Erro de domínio: lança `HttpError` (`src/core/errors/http-error.ts`; subclasses em `src/core/errors/`) no use-case → `errorHandler` global formata.

### Responsabilidade por camada

- **Router:** monta path, aplica middlewares (auth/period/validate), liga ao controller. Sem lógica.
- **Controller:** extrai `req.user`/`params`/`body`/`query`, chama **1 use-case**, retorna `ResponseHandler`.
- **Use-Case:** 1 operação de negócio. Chama repositórios, validations e helpers do módulo; outro módulo só via `index.ts` público dele.
- **Services de módulo (`modules/<x>/services/`):** utilitário stateless entre ≥2 use-cases. Nunca chama use-case.
- **Repository:** objeto literal `satisfies I<Nome>Repository`. Só queries Drizzle. Interface no próprio módulo.
- **Validations (`modules/<x>/validations/`):** funções async que checam existência/ownership e lançam `HttpError`.
- **Schemas (`modules/<x>/schemas/`):** schemas Zod do módulo; genéricos compartilhados em `src/core/schemas/` (id-param, filter, pagination).
- **OpenAPI:** cada módulo registra endpoints em `<x>.paths.ts`; `core/openapi/generate.ts` agrega (health em `core/openapi/paths.ts`).

## Infraestrutura

- **Entrypoints:** `src/server.ts` (local, `app.listen` + scheduler) | `api/index.js` (Vercel, sem listen; jobs pelo cron).
- **Middlewares globais** (`src/server.ts`): `securityMiddleware` (helmet/cors/rate-limit/slow-down), `express.json({limit:"10mb"})`, `sanitizeData`, router, `errorHandler` (último).
- **Scheduler:** `processRecurringTransactions()` + `processBudgetAlerts()` + `processBillReminders()` rodam a cada 1h + 1x no startup (só fora de `NODE_ENV=test`) — importados via `index.ts` dos módulos.
- **DB connect:** `connectDB()` em `src/infra/db/index.ts`, exporta `db`.
- **Health:** `GET /health`.
- **Períodos financeiros:** middleware `ensurePeriodExists` (`modules/financial-period`) cria período atual + 1 futuro a cada request autenticado nas rotas que o usam.

## Convenções de path

- Routers montados em `src/routes.ts` (importados dos `index.ts` de cada módulo): `/auth`, `/user`, `/transactions`, `/categories`, `/budgets`, `/goals`, `/overview`, `/recurring-transactions`, `/notifications`, `/companies`, `/overtime`.
- Migrations: `src/infra/db/migrations/` (geradas por `drizzle-kit generate`).
- Tipos de domínio: dentro do módulo dono (`modules/<x>/<x>.types.ts`). Tipos de tabela: inferidos em `src/infra/db/schema.ts` (`User`/`NewUser`, etc).
