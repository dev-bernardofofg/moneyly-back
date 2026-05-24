# 03 — Modelo de Domínio

Fonte de verdade: `src/db/schema.ts` (Drizzle). Atualizar este doc quando o schema mudar.

> **Âncora:** sincronizado em commit `687b470` (refactor overtime month/year). Se HEAD divergiu e mexeu em `src/db/schema.ts`, releia o schema antes de confiar.

## Tabelas

### `users`

`id` uuid PK · `name` · `email` unique · `password` (nullable, OAuth) · `googleId` unique nullable · `avatar` · `monthlyIncome` decimal(10,2) default 0 · `financialDayStart` int default 1 · `financialDayEnd` int default 31 · `firstAccess` bool default true · timestamps.

> `financialDayStart/End` definem o período financeiro pessoal (não o mês civil).

### `transactions`

`id` · `userId`→users (cascade) · `type` enum `income|expense` · `title` · `amount` decimal(10,2) · `categoryId`→categories (cascade) · `periodId`→financial_periods (cascade, nullable) · `recurringTransactionId` uuid nullable · `overtimeRecordId` uuid nullable (FK→overtime_records; transação derivada de horas extras) · `description` · `date` default now · timestamps.

### `categories`

`id` · `userId`→users nullable (null = global) · `name` · `isGlobal` bool default false · timestamps.

> Categorias globais (seed) + customizadas por usuário. Visibilidade por usuário em `user_category_preferences`.

### `user_category_preferences`

`id` · `userId`→users · `categoryId`→categories · `isVisible` bool default true · timestamps.

> Controla quais categorias globais o usuário vê/oculta.

### `budgets` (orçamento por categoria)

`id` · `userId`→users · `categoryId`→categories · `monthlyLimit` decimal(10,2) · timestamps.

> **Regra:** 1 orçamento por categoria por usuário (service checa `findByUserIdAndCategoryId` → 409 "Já existe um orçamento para esta categoria").
> Progresso (`spent`/`remaining`/`percentage`/`status`) é calculado em runtime sobre transações do período. `status`: `safe` <75 · `attention` ≥75 · `warning` ≥90 · `exceeded` ≥100.

### `goals` (metas de poupança)

`id` · `userId`→users · `title` · `description` · `targetAmount` decimal · `currentAmount` decimal default 0 · `targetDate` · `startDate` default now · `isActive` bool default true · timestamps.

### `goal_milestones`

`id` · `goalId`→goals (cascade) · `percentage` int (25/50/75/100) · `amount` decimal · `isReached` bool · `reachedAt` · createdAt.

### `financial_periods`

`id` · `userId`→users · `startDate` · `endDate` · `isActive` bool default true · timestamps.

> Materialização do período financeiro. Criado/garantido pelo middleware `ensurePeriodExists` (atual + 1 futuro). Transações referenciam via `periodId`.

### `notifications` (F2 — alertas)

`id` · `userId`→users (cascade) · `type` enum `budget_alert` · `severity` enum `info|warning|danger` · `title` · `message` · `relatedId` uuid nullable (ex budgetId) · `periodId`→financial_periods (cascade, nullable) · `dedupeKey` text **unique** · `isRead` bool default false · `createdAt`.

> **Idempotência:** `dedupeKey = budget:<budgetId>:<periodId>:<status>` — 1 notificação por budget/período/nível. Geração interna (`processBudgetAlerts` no scheduler 1h, sem create manual). Migration `0004_happy_veda.sql`.

### `companies` (F7 — horas extras)

`id` · `userId`→users (cascade) · `name` varchar(100) · `hourlyRate` decimal(10,2) · `isActive` bool default true · timestamps.

> Soft-delete via `isActive = false` — preserva histórico de overtime vinculado. Mudança de `hourlyRate` não recalcula registros existentes (taxa congelada em `overtime_records.hourlyRateSnapshot`).

### `overtime_records` (F7 — horas extras)

`id` · `userId`→users (cascade) · `companyId`→companies (cascade) · `description` varchar(500) nullable · `startTime` timestamp · `endTime` timestamp · `hoursWorked` decimal(10,2) (calculado e armazenado) · `hourlyRateSnapshot` decimal(10,2) (congelado no cadastro) · `amount` decimal(10,2) (`hoursWorked x hourlyRateSnapshot`, armazenado) · `month` int (1-12) · `year` int — mês civil derivado de `startTime` · `transactionId` uuid nullable→transactions · timestamps.

> Usa **mês civil** (não período financeiro) para agrupar/filtrar. Transaction vinculada recebe `periodId` financeiro normal. Criação: gera income transaction. Edição: recalcula e sincroniza transaction. Deleção: deleta transaction vinculada primeiro.

### `refresh_tokens`

`id` · `userId`→users · `token` unique (hasheado) · `expiresAt` · createdAt.

### `recurring_transactions`

`id` · `userId`→users · `type` `income|expense` · `title` · `amount` · `categoryId`→categories · `frequency` enum `daily|weekly|monthly|yearly` · `dayOfMonth` int (monthly) · `dayOfWeek` int 0-6 (weekly, dom=0) · `startDate` · `totalInstallments` · `executedInstallments` int default 0 · `nextExecution` (notNull) · `isActive` bool default true · `description` · timestamps.

> Scheduler (`processRecurringTransactions`, src/server.ts) executa a cada 1h: gera `transactions` quando `nextExecution` vence, atualiza `nextExecution`/`executedInstallments`, desativa ao atingir `totalInstallments`.

## Relacionamentos chave

- `users` 1—N `transactions`, `categories`, `budgets`, `goals`, `financialPeriods`, `refreshTokens`, `recurringTransactions`, `categoryPreferences`, `companies`, `overtimeRecords`.
- `transactions` N—1 `users`, `categories`, `financialPeriods`; FK nullable → `recurringTransactions`, `overtimeRecords`.
- `goals` 1—N `goalMilestones`.
- `companies` 1—N `overtimeRecords`.
- Deletes em cascata via FK `onDelete: "cascade"`.

## Tipos inferidos

`schema.ts` exporta `Entidade`/`NewEntidade` para cada tabela (`$inferSelect`/`$inferInsert`). Repositórios usam esses tipos. Tipos de resposta de domínio (ex: `BudgetProgress`) em `src/types/*.types.ts`.

## Regras de negócio não óbvias

- Decimais salvos como string no Postgres; converter com `Number()` em cálculo, `.toString()` ao persistir; resposta normaliza via `ResponseHandler`.
- Período financeiro ≠ mês civil — sempre calcular via helpers de `financial-period.ts` no timezone São Paulo.
- `getUserBudgetsService` aceita `periodId?` opcional (query) — sem ele usa período atual (`ensureCurrentPeriodExists`).
- Categoria global tem `userId = null` + `isGlobal = true`; não deletável por usuário comum.
- Overtime usa mês civil (`month`/`year`) para agrupamento — independente do período financeiro do usuário.
