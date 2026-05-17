# 03 — Modelo de Domínio

Fonte de verdade: `src/db/schema.ts` (Drizzle). Atualizar este doc quando o schema mudar.

> **Âncora:** sincronizado em commit `239f099`. Se HEAD divergiu e mexeu em `src/db/schema.ts`, releia o schema antes de confiar.

## Tabelas

### `users`
`id` uuid PK · `name` · `email` unique · `password` (nullable, OAuth) · `googleId` unique nullable · `avatar` · `monthlyIncome` decimal(10,2) default 0 · `financialDayStart` int default 1 · `financialDayEnd` int default 31 · `firstAccess` bool default true · timestamps.
> `financialDayStart/End` definem o período financeiro pessoal (não o mês civil).

### `transactions`
`id` · `userId`→users (cascade) · `type` enum `income|expense` · `title` · `amount` decimal(10,2) · `categoryId`→categories (cascade) · `periodId`→financial_periods (cascade, nullable) · `recurringTransactionId` uuid nullable · `description` · `date` default now · timestamps.

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

### `refresh_tokens`
`id` · `userId`→users · `token` unique (hasheado) · `expiresAt` · createdAt.

### `recurring_transactions`
`id` · `userId`→users · `type` `income|expense` · `title` · `amount` · `categoryId`→categories · `frequency` enum `daily|weekly|monthly|yearly` · `dayOfMonth` int (monthly) · `dayOfWeek` int 0-6 (weekly, dom=0) · `startDate` · `totalInstallments` · `executedInstallments` int default 0 · `nextExecution` (notNull) · `isActive` bool default true · `description` · timestamps.
> Scheduler (`processRecurringTransactions`, src/server.ts) executa a cada 1h: gera `transactions` quando `nextExecution` vence, atualiza `nextExecution`/`executedInstallments`, desativa ao atingir `totalInstallments`.

## Relacionamentos chave

- `users` 1—N `transactions`, `categories`, `budgets`, `goals`, `financialPeriods`, `refreshTokens`, `recurringTransactions`, `categoryPreferences`.
- `transactions` N—1 `users`, `categories`, `financialPeriods`, `recurringTransactions`.
- `goals` 1—N `goalMilestones`.
- Deletes em cascata via FK `onDelete: "cascade"`.

## Tipos inferidos

`schema.ts` exporta `Entidade`/`NewEntidade` para cada tabela (`$inferSelect`/`$inferInsert`). Repositórios usam esses tipos. Tipos de resposta de domínio (ex: `BudgetProgress`) em `src/types/*.types.ts`.

## Regras de negócio não óbvias

- Decimais salvos como string no Postgres; converter com `Number()` em cálculo, `.toString()` ao persistir; resposta normaliza via `ResponseHandler`.
- Período financeiro ≠ mês civil — sempre calcular via helpers de `financial-period.ts` no timezone São Paulo.
- `getUserBudgetsService` aceita `periodId?` opcional (query) — sem ele usa período atual (`ensureCurrentPeriodExists`).
- Categoria global tem `userId = null` + `isGlobal = true`; não deletável por usuário comum.
