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

- `POST /transactions/create` criar · `GET /transactions/` listar (paginado) · `PUT /transactions/:id` · `DELETE /transactions/:id` · `GET /transactions/summary` resumo · `GET /transactions/summary-current-period` resumo período atual.
- `GET /transactions/` aceita query params: `category` (uuid), `periodId` (uuid), `type` (`income|expense`), `startDate`, `endDate`, `page`, `limit`. Quando `periodId` é passado, filtra diretamente pela coluna — mais preciso que range de data.
- `GET /transactions/export` CSV aceita os mesmos filtros (sem paginação): `periodId`, `type`, `startDate`, `endDate`.
- Filtros reutilizáveis em `src/schemas/filter.schema.ts` (`baseFilterSchema` + primitivos `dateRange/period/type/category`). Novos módulos compõem via `.merge()`.
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
- `add-amount` notifica milestones recém-atingidos (F9 — ver seção Notifications).

## Overview / Dashboard (`/overview`)

- `POST /overview/periods` períodos disponíveis · `POST /overview/dashboard` dados dashboard · `GET /overview/planner` planejamento · insights.
- `overview.*`, `helpers/handlers/overview-handlers.ts`, `helpers/mappers.ts`. Schema `overview.schema.ts`.
- `GET /overview/forecast?periodId=` (F1) saldo projetado: `forecast.service.ts` — reusa recurring + período + transactions, projeta ocorrências futuras até `endDate`. Sem schema DB. Read-only.
- `GET /overview/insights/comparison?periodsBack=` (F4) comparativo: `comparative-insights.service.ts` + helper puro `helpers/comparative-insights.ts`. Aditivo — não altera `/overview/insights`.
- `GET /transactions/subscriptions` (F3) detector de assinaturas: `subscription.service.ts` + helper puro `helpers/subscription-detector.ts`. Heurística sobre transactions (≥3 ocorrências, valor ±10%, cadência semanal/mensal/anual), exclui já-recorrentes. Read-only.

## Recurring Transactions (`/recurring-transactions`)

- CRUD de transações recorrentes (`daily|weekly|monthly|yearly`, parcelas).
- `recurring-transaction.*`. **Scheduler:** `processRecurringTransactions()` (src/server.ts) roda a cada 1h + startup, materializa em `transactions` quando `nextExecution` vence. Scripts backfill em `src/scripts/`.
- `POST /recurring-transactions/from-subscription` (F10) converte candidato do detector F3 em recorrente: `convertSubscriptionToRecurringService` (subscription.service). 409 se título normalizado já existe ativo; `startDate` avançada p/ futuro (evita relançar despesa já registrada). Ver `.specs/features/09-subscription-to-recurring.md`.

## Notifications (`/notifications`) — F2/F8/F9

- `GET /notifications?unreadOnly=&page=&limit=` paginado · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all`.
- **Migrado para `src/modules/notification/`** (piloto da estrutura modular — ver `06`): use-cases 1-operação, repositório + interface no módulo, `notification.paths.ts` próprio. `processBudgetAlerts` ligado ao scheduler de `src/server.ts` (mesmo `setInterval` do recurring). Idempotência via `notifications.dedupeKey` unique. Geração reusa `getBudgetProgressService`.
- **F8 lembrete de contas:** `processBillReminders` (bill-reminder.service) no mesmo scheduler — despesas recorrentes ativas com `nextExecution` em ≤3 dias → `type: bill_reminder`. Ver `.specs/features/07-bill-reminders.md`.
- **F9 milestones de meta:** `notifyGoalMilestones` (notification.service) chamado por `addAmountToGoalService` quando milestone 25/50/75/100 é recém-atingido → `type: goal_milestone`. Falha de notificação não quebra o add-amount. Ver `.specs/features/08-goal-milestone-alerts.md`.
- **Transação criada:** `notifyTransactionCreated` no `createTransactionUseCase` (e hora extra) → `transaction_income` / `transaction_expense`. Título/mensagem com valor e data. Push leva `url=/transactions?id=<id>`, `icon` e `relatedId`. Ver `.specs/features/10-transaction-created-alerts.md`.

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
