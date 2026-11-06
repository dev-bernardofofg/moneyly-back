# 05 — Catálogo de Features

Mapa de módulos → arquivos + regras não-óbvias. Atualizar ao adicionar/alterar feature.
Cada módulo segue camadas: `routes/<x>.router.ts` → `controllers/<x>.controller.ts` → `services/<x>.service.ts` → `repositories/<x>.repository.ts`.

> **Âncora:** sincronizado em commit `239f099`.
> **Fonte de verdade de endpoints/payloads: `openapi.json`** (Swagger `/api-docs`). Lista abaixo é orientação rápida — em divergência, vale o openapi. Specs aqui focam o que o openapi NÃO diz (regras, scheduler, internals).

## Auth (`/auth`)

- `POST /auth/sign-up` cadastro · `POST /auth/sign-in` login · `POST /auth/google` OAuth Google · refresh token.
- Arquivos: `auth.controller`, `auth.service` (login/signup), `google.service` (OAuth), `refresh-token.repository`, `user.repository`, helpers `token.ts`/`bcrypt.ts`. Schema `auth.schema.ts`.

## User (`/user`)

- Perfil, `financialDayStart/End`, `firstAccess`. Sem renda fixa: a renda do período é entradas realizadas + recorrentes previstas (`overview/helpers/expected-income.ts`); salário entra como recorrência de entrada.
- `user.controller`/`user.service`/`user.repository`. Schema `user.schema.ts`. `requireUser` em `validations/user.validation.ts`.

## Transactions (`/transactions`)

- `POST /transactions/create` criar · `GET /transactions/` listar (paginado) · `PUT /transactions/:id` · `DELETE /transactions/:id` · `GET /transactions/summary` resumo · `GET /transactions/summary-current-period` resumo período atual.
- `GET /transactions/` aceita query params: `category` (uuid), `periodId` (uuid), `type` (`income|expense`), `startDate`, `endDate`, `page`, `limit`. Quando `periodId` é passado, filtra diretamente pela coluna — mais preciso que range de data.
- `GET /transactions/export` CSV aceita os mesmos filtros (sem paginação): `periodId`, `type`, `startDate`, `endDate`.
- `/accounts` (F12) CRUD de contas e cartões (`checking` | `credit_card` com `closingDay`/`dueDay`); conta padrão criada sob demanda. Toda transação tem `accountId`; no cartão o `periodId` é o do vencimento da fatura (`account/helpers/billing-date.ts`). Filtro `accountId` em `GET /transactions/` e export.
- `POST /transactions/import/preview` (F11) recebe OFX em base64url (`file`; UTF-8 ou windows-1252), devolve itens `new`/`imported`/`possible_duplicate` (manual com mesmo tipo, valor e dia SP) + categoria sugerida pelo histórico (fallback global "Outros"). `POST /transactions/import` cria os confirmados; idempotente por `transactions.external_id` (`banco:conta:FITID`, único por usuário). Sem push por linha. Parser puro: `helpers/ofx-parser.ts`. Fatura do Inter em PDF (`%PDF-`): texto via `pdf-parse` (`helpers/pdf-text.ts`), parser puro `helpers/inter-bill-parser.ts` (linha começa com "01 de set. 2026", termina no valor; `+` = crédito; Pix parcelado em 3 linhas). Preview devolve `bill { dueDate, total }`; confirm com `billDueDate` põe todas as linhas do cartão no período do vencimento (parcela de compra antiga também). Id estável: `inter-pdf:dia:valor:título:ordem`. Statuses também `bill_payment` e `transfer` (ver F12). `isBillPayment` recebe o tipo da conta: entrada em corrente e despesa em cartão nunca são pagamento de fatura. `billPayments` da confirmação leva `externalId`; em conta corrente cada linha grava uma saída em `bill_payment_outflows`, e reenvio não duplica (a prévia marca a linha como `imported`).
- **Import no check-in (F21):** `accountId` é opcional na prévia, para qualquer formato. O parser devolve `accountKey` (OFX: `banco:conta`; PDF do Inter: `inter:<identificador do cartão>`) e `through` (DTEND ou a maior data de lançamento). Com `accountKey` conhecida em `accounts.statement_key`, o back resolve a conta; com chave nova, a resposta traz `needsAccount: true` e a associação é salva na confirmação. Chaves fracas (`:pdf`, `:unknown`) nunca são salvas (`helpers/statement-key.ts`). `POST /transactions/import` exige `accountId`, `accountKey` e `through`, aceita `items: []` e atualiza `data_through` com o maior valor entre o atual e `through`, limitado a hoje. OFX sem lançamentos mas com `DTEND` é aceito. `GET /accounts` expõe `dataThrough` e `freshness`.
- Filtros reutilizáveis em `src/schemas/filter.schema.ts` (`baseFilterSchema` + primitivos `dateRange/period/type/category`). Novos módulos compõem via `.merge()`.
- `transaction.*`. Paginação via `helpers/pagination.ts` + `schemas/pagination.schema.ts`. Vincula `periodId` (período financeiro).

## Categories (`/categories`)

- `GET /categories/` listar (globais + custom + preferências) · `POST /categories/create` · `PUT /categories/:id` · `DELETE /categories/:id`.
- `categories.*`. Globais: `userId=null`, `isGlobal=true`. Visibilidade: `user-category-preferences.repository`. Seed: `lib/seed-categories.ts` (`pnpm restore:categories`).

## Budgets (`/budgets`)

> F21: o módulo continua no back, mas o front não o usa e orçamentos saíram da fórmula do Saldo Livre. A remoção é tarefa separada.

- `POST /budgets/` criar · `GET /budgets/?periodId=` listar c/ progresso · `PUT /budgets/:id` · `DELETE /budgets/:id`.
- `budget.*`. 1 orçamento/categoria/usuário (409 se duplicado). Progresso calculado sobre transações do período. Status: safe/attention(≥75)/warning(≥90)/exceeded(≥100). Router usa `ensurePeriodExists`.

## Goals (`/goals`)

> F21: mesmo estado dos orçamentos. O módulo fica no back e o front não o usa.

- `POST /goals/` · `GET /goals/` · `GET /goals/:id` · `PUT /goals/:id` · `POST /goals/:id/add-amount` · `DELETE /goals/:id`.
- `goal.*`. Milestones 25/50/75/100 em `goal_milestones`. Progresso: `helpers/goal-progress.ts`.
- `add-amount` notifica milestones recém-atingidos (F9 — ver seção Notifications).

## Overview / Dashboard (`/overview`)

- `POST /overview/periods` períodos disponíveis · `POST /overview/dashboard` dados dashboard · insights. `GET /overview/planner` foi removido no F21.
- `overview.*`, `helpers/handlers/overview-handlers.ts`, `helpers/mappers.ts`. Schema `overview.schema.ts`.
- `GET /overview/forecast` (F1, refeito no F21) responde `{ freeBalance }` sempre para hoje, sem `periodId`: saldo atual das contas + outras entradas − recorrentes de saída − faturas, até o dia anterior ao próximo salário. `get-free-balance.use-case.ts`; fórmula, janela e confiança em `features/01-cash-flow-forecast.md`. Sem schema DB. Read-only.
- `GET /overview/insights?periodId=` gastos do período selecionado agrupados por `periodId` (cartão no período da fatura): `spending` (gasto, contas recorrentes que ainda caem, previsto, média dos períodos anteriores com movimento, delta/signal), `history` (últimos 6 períodos) e `categories` (valor, % do total, média e delta por categoria). Helper puro `helpers/period-insights.ts`. Substituiu a tendência por mês do calendário, totais de todo o histórico e melhor/pior mês.
- Comparativo F4: endpoint `/overview/insights/comparison` removido em 2026-10-26 (absorvido por `/overview/insights`). O helper puro `helpers/comparative-insights.ts` segue em uso nas prévias do dashboard e fornece `signalOf`/`deltaOf`.
- `GET /transactions/subscriptions` (F3) detector de assinaturas: `subscription.service.ts` + helper puro `helpers/subscription-detector.ts`. Heurística sobre transactions (≥3 ocorrências, valor ±10%, cadência semanal/mensal/anual), exclui já-recorrentes. Read-only.

## Recurring Transactions (`/recurring-transactions`)

- CRUD de transações recorrentes (`daily|weekly|monthly|yearly`, parcelas).
- `recurring-transaction.*`. Recorrência é só previsão desde o F21: criá-la não gera transação. **Scheduler:** `processRecurringTransactions()` (job diário em `jobs/scheduled-jobs.ts`) só avança `nextExecution` e `executedInstallments`, para manter lembretes e parcelas.
- `POST /recurring-transactions/from-subscription` (F10) converte candidato do detector F3 em recorrente: `convertSubscriptionToRecurringService` (subscription.service). 409 se título normalizado já existe ativo; `startDate` avançada p/ futuro (evita relançar despesa já registrada). Ver `.specs/features/09-subscription-to-recurring.md`.

## Notifications (`/notifications`) — F2/F8/F9

- `GET /notifications?unreadOnly=&page=&limit=` paginado · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all`.
- **F21:** o job de alertas de orçamento e o de alertas de gasto saíram do scheduler (`JOBS` = recorrências, lembretes de conta e de fatura e check-in). Criar, apagar ou importar transação também não dispara alerta de gasto. `notifyGoalMilestones` continua ligado a `POST /goals/:id/add-amount`, que o front não chama mais.
- **Lembrete de check-in (F21):** `processCheckInReminders` (cron diário) envia `check_in_reminder` quando alguma conta ativa está `stale` ou `empty`, no máximo um por usuário a cada 7 dias. O push abre `/check-in`. `dedupeKey` `check-in:<userId>:<yyyy-MM-dd>`.
- **Migrado para `src/modules/notification/`** (piloto da estrutura modular — ver `06`): use-cases 1-operação, repositório + interface no módulo, `notification.paths.ts` próprio. `processBudgetAlerts` continua exportado pelo módulo, mas não está em `JOBS` (`jobs/scheduled-jobs.ts`) desde o F21, então não roda. Idempotência via `notifications.dedupeKey` unique. Geração reusa `getBudgetProgressService`.
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
