# 05 — Catálogo de Features

Mapa de módulos → arquivos + regras não-óbvias. Atualizar ao adicionar/alterar feature.
Cada módulo segue camadas: `routes/<x>.router.ts` → `controllers/<x>.controller.ts` → `services/<x>.service.ts` → `repositories/<x>.repository.ts`.

> **Âncora:** sincronizado em commit `239f099`.
> **Fonte de verdade de endpoints/payloads: `openapi.json`** (Swagger `/api-docs`). Lista abaixo é orientação rápida — em divergência, vale o openapi. Specs aqui focam o que o openapi NÃO diz (regras, scheduler, internals).

## Auth (`/auth`)
- `POST /auth/sign-up` cadastro · `POST /auth/sign-in` login · `POST /auth/google` OAuth Google · refresh token.
- Arquivos: `auth.controller`, `auth.service` (login/signup), `google.service` (OAuth), `refresh-token.repository`, `user.repository`, helpers `token.ts`/`bcrypt.ts`. Schema `auth.schema.ts`.

## User (`/user`)
- Perfil, `monthlyIncome`, `financialDayStart/End`, `firstAccess`.
- `user.controller`/`user.service`/`user.repository`. Schema `user.schema.ts`. `requireUser` em `validations/user.validation.ts`.

## Transactions (`/transactions`)
- `POST /transactions/create` criar · `POST /transactions/` listar (paginado) · `PUT /transactions/:id` · `DELETE /transactions/:id` · `GET /transactions/summary` resumo · `GET /transactions/summary-current-period` resumo período atual.
- `transaction.*`. Paginação via `helpers/pagination.ts` + `schemas/pagination.schema.ts`. Vincula `periodId` (período financeiro).

## Categories (`/categories`)
- `GET /categories/` listar (globais + custom + preferências) · `POST /categories/create` · `PUT /categories/:id` · `DELETE /categories/:id`.
- `categories.*`. Globais: `userId=null`, `isGlobal=true`. Visibilidade: `user-category-preferences.repository`. Seed: `lib/seed-categories.ts` (`pnpm restore:categories`).

## Budgets (`/budgets`)
- `POST /budgets/` criar · `GET /budgets/?periodId=` listar c/ progresso · `PUT /budgets/:id` · `DELETE /budgets/:id`.
- `budget.*`. 1 orçamento/categoria/usuário (409 se duplicado). Progresso calculado sobre transações do período. Status: safe/attention(≥75)/warning(≥90)/exceeded(≥100). Router usa `ensurePeriodExists`.

## Goals (`/goals`)
- `POST /goals/` · `GET /goals/` · `GET /goals/:id` · `PUT /goals/:id` · `POST /goals/:id/add-amount` · `DELETE /goals/:id`.
- `goal.*`. Milestones 25/50/75/100 em `goal_milestones`. Progresso: `helpers/goal-progress.ts`.

## Overview / Dashboard (`/overview`)
- `POST /overview/periods` períodos disponíveis · `POST /overview/dashboard` dados dashboard · `GET /overview/planner` planejamento · insights.
- `overview.*`, `helpers/handlers/overview-handlers.ts`, `helpers/mappers.ts`. Schema `overview.schema.ts`.
- `GET /overview/forecast?periodId=` (F1) saldo projetado: `forecast.service.ts` — reusa recurring + período + transactions, projeta ocorrências futuras até `endDate`. Sem schema DB. Read-only.

## Recurring Transactions (`/recurring-transactions`)
- CRUD de transações recorrentes (`daily|weekly|monthly|yearly`, parcelas).
- `recurring-transaction.*`. **Scheduler:** `processRecurringTransactions()` (src/server.ts) roda a cada 1h + startup, materializa em `transactions` quando `nextExecution` vence. Scripts backfill em `src/scripts/`.

## Financial Periods (interno, sem router próprio)
- `financial-period.service` + `financial-period.repository` + `helpers/financial-period.ts`.
- Middleware `ensurePeriodExists` (`middlewares/auto-period-creation.ts`): garante período atual + 1 futuro por request autenticado.
- Timezone fixo America/Sao_Paulo. Período = `financialDayStart`..`financialDayEnd` do usuário (pode cruzar meses).

## Infra transversal
- `middlewares/`: `auth`, `validate`, `error-handler`, `security` (helmet/cors/rate-limit), `sanitize`, `auto-period-creation`.
- `helpers/`: `response-handler` (ResponseHandler + normalizeDecimals), `errors` (isHttpError), `dates`, `pagination`, `token`, `bcrypt`.
- `lib/`: `logger`, `axios-instance`, `seed-categories`.
- Geração front: `kubb.config.ts`, `orval.config.ts`, `openapi.json` → `pnpm api:generate`.
- **`openapi.json`:** gerado por `pnpm openapi:gen` (zod-to-openapi, task I1 — ver `.specs/features/00-openapi-generator.md`). Hoje ainda manual/podre até I1. Nunca editar à mão.
