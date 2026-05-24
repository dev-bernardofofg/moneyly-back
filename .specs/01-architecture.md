# 01 — Arquitetura

## Stack

- **Runtime:** Node.js + TypeScript (`tsc` build, `ts-node-dev` dev)
- **Web:** Express 4
- **DB:** PostgreSQL via **Drizzle ORM** (`postgres` driver)
- **Validação:** Zod 3
- **Auth:** JWT (access + refresh token), Google OAuth opcional
- **Testes:** Jest (unit + integração), Playwright (e2e)
- **Docs:** OpenAPI/Swagger em `/api-docs` (lê `openapi.json` da raiz)
- **Geração front:** Kubb (tipos TS + Zod) + Orval (hooks React Query) via `pnpm api:generate`
- **Deploy:** Vercel (`api/index.ts` é o entrypoint serverless; `src/server.ts` é o entrypoint local)
- **Package manager:** pnpm

## Camadas (fluxo de um request)

```
Router (src/routes/*.router.ts)
  → middlewares: authenticateUser → ensurePeriodExists → validateBody/Params/Query
  → Controller (src/controllers/*.controller.ts)   # só HTTP, sem regra de negócio
  → Service (src/services/*.service.ts)             # regra de negócio, validações de domínio
  → Repository (src/repositories/*.repository.ts)   # acesso a dados Drizzle, satisfies I*Repository
  → DB (src/db/schema.ts)
```

Resposta sempre via `ResponseHandler` (`src/helpers/response-handler.ts`).
Erro de domínio: lança `HttpError(status, msg, details)` no Service → controller faz `if (isHttpError(error)) return next(error)` → `errorHandler` global formata.

### Responsabilidade por camada

- **Router:** monta path, aplica middlewares (auth/period/validate), liga ao controller. Sem lógica.
- **Controller:** extrai `req.user`/`params`/`body`/`query`, chama service, retorna `ResponseHandler`. Try/catch + `isHttpError → next`. Checa `req.user` (401).
- **Service:** orquestra regra. Chama `requireUser`, validações (`src/validations/*`), repositórios. Lança `HttpError`. Retorna dados puros (sem `res`).
- **Repository:** objeto literal `satisfies I<Nome>Repository`. Só queries Drizzle. Reexporta a interface.
- **Validations (`src/validations/`):** funções async que checam existência/ownership e lançam `HttpError`.
- **Schemas (`src/schemas/`):** schemas Zod, validados pelo middleware genérico `validate.ts`.

## Infraestrutura

- **Entrypoints:** `src/server.ts` (local, `app.listen` + scheduler) | `api/index.ts` (Vercel).
- **Middlewares globais** (`src/server.ts`): `securityMiddleware` (helmet/cors/rate-limit/slow-down), `express.json({limit:"10mb"})`, `sanitizeData`, router, `errorHandler` (último).
- **Scheduler:** `processRecurringTransactions()` roda a cada 1h + 1x no startup (só fora de `NODE_ENV=test`).
- **DB connect:** `connectDB()` em `src/db/index.ts`, exporta `db`.
- **Health:** `GET /health`.
- **Períodos financeiros:** middleware `ensurePeriodExists` cria período atual + 1 futuro a cada request autenticado nas rotas que o usam.

## Convenções de path

- Routers montados em `src/routes.ts`: `/auth`, `/user`, `/transactions`, `/categories`, `/budgets`, `/goals`, `/overview`, `/recurring-transactions`, `/notifications`, `/companies`, `/overtime`.
- Migrations: `src/db/migrations/` (geradas por `drizzle-kit generate`).
- Tipos de domínio compartilhados: `src/types/*.types.ts`. Tipos de tabela: inferidos em `src/db/schema.ts` (`User`/`NewUser`, etc).
