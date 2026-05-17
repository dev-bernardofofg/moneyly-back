# F2 — Alertas de Orçamento

**Tipo:** feature. **Status:** spec. **Esforço:** médio. **Schema novo:** tabela `notifications`.
**Por quê:** tendência 2026 (engajamento/alertas). Back já calcula `getBudgetStatus` (safe/attention/warning/exceeded) e já roda scheduler horário (`processRecurringTransactions` em `src/server.ts`). Falta persistir e expor alertas.

## Objetivo

Gerar notificações quando o gasto de uma categoria cruza limiar do orçamento (≥75 attention, ≥90 warning, ≥100 exceeded), persistir, e expor p/ o front listar/marcar como lida. Idempotente: 1 notificação por (budget, período, nível) — não spammar a cada tick.

## Schema DB (novo)

`notifications` (Drizzle, `src/db/schema.ts`):
```
id            uuid pk default random
userId        uuid not null → users.id (cascade)
type          text enum ["budget_alert"] not null   // extensível p/ F1/goals depois
severity      text enum ["info","warning","danger"] not null
title         text not null
message       text not null
relatedId     uuid                                   // budgetId (nullable, p/ outros tipos)
periodId      uuid → financial_periods.id (cascade, nullable)
dedupeKey     text not null                          // ex `budget:<budgetId>:<periodId>:<level>`
isRead        boolean default false not null
createdAt     timestamp default now not null
```
- Índice/unique em `dedupeKey` (idempotência).
- `relations`: `user one`. Exports `Notification`/`NewNotification`.
- `pnpm db:generate` → revisar migration → `db:push`.

## Endpoints (`/notifications`, novo router)

- `GET /notifications?unreadOnly=<bool?>&page=&limit=` → paginado (`wrapPaginated`).
- `PATCH /notifications/:id/read` → marca lida (404 se não do user).
- `PATCH /notifications/read-all` → marca todas lidas.
- (sem create manual — geração é interna pelo scheduler/serviço)
- Auth bearer. Registrar em `src/routes.ts` `router.use("/notifications", NotificationRouter)`.

## Geração de alertas

`processBudgetAlerts()` em `src/services/notification.service.ts`:
- Para cada user com orçamentos: reusa lógica de `getUserBudgetsService`/`getBudgetProgressService` (spent/percentage/status do período atual).
- Para cada budget com `percentage >= 75`: nível = mapeamento (`attention`→info, `warning`→warning, `exceeded`→danger).
- `dedupeKey = budget:<budgetId>:<periodId>:<level>`. Se já existe → skip (idempotente). Senão insere.
- Não rebaixa: se já tem `exceeded`, não cria `warning` depois.

**Gatilho:** adicionar ao scheduler existente em `src/server.ts` (mesmo bloco `setInterval` 1h + run startup). Não criar novo scheduler. Try/catch + `logger.error` igual recurring.
> Opção complementar (v1.1): disparar checagem pontual após criar transação de expense (hook no `createTransactionService`) — fora do escopo v1, registrar.

## Camadas (seguir `04-feature-playbook.md`)

1. Schema `notifications` + migration.
2. `INotificationRepository` + `notification.repository.ts` (`create`, `findByUserPaginated`, `findByDedupeKey`, `markRead(id,userId)`, `markAllRead(userId)`).
3. Validações: notificação pertence ao user (404).
4. `notification.service.ts`: `processBudgetAlerts()`, `listNotificationsService`, `markReadService`, `markAllReadService`.
5. Schema Zod: `notificationQuerySchema` (`unreadOnly` coerce bool, page/limit) em `src/schemas/notification.schema.ts`.
6. `notification.controller.ts` (padrão ResponseHandler/isHttpError).
7. `notification.router.ts` + registrar em `routes.ts`.
8. OpenAPI: `Notification` em `src/openapi/schemas.ts`; rotas em `paths.ts` (`/notifications` GET paginado, PATCHs). `pnpm openapi:gen`.

## Edge cases

- Usuário sem orçamentos → nenhuma notificação.
- Mudança de período: `dedupeKey` inclui `periodId` → novo período reabre alertas (correto).
- Limite editado p/ maior e gasto cai <75% → não apaga notificação antiga (histórico); front filtra por `isRead`.
- Concorrência scheduler: unique `dedupeKey` evita duplicata em corrida (insert falha → catch → skip).
- Severidade sobe (warning→exceeded) → nova notificação (dedupeKey difere no `level`). Aceito (2 entradas, níveis distintos).

## Testes

- Unit `notification.service`: gera p/ ≥75/≥90/≥100; idempotência (rodar 2x = 1 registro); não rebaixa; sem budget = nada.
- Unit repos: dedupe, markRead ownership.
- Integração: `GET /notifications`, `unreadOnly`, `PATCH read`/`read-all`, 401, 404 alheio.
- OpenAPI: rotas presentes (regressão router↔openapi).

## Roadmap / contrato

- `moneyly/.specs/03-feature-roadmap.md`: F2 Back WIP→Done; Front consome hooks gerados (sininho + lista).
- Front spec: `moneyly-front/.specs/features/02-budget-alerts.md` (badge não-lidas + dropdown).
- `moneyly-back/.specs/03-domain-model.md`: adicionar tabela `notifications` ao mergear.

## DoD

- [ ] Tabela `notifications` + migration aplicada
- [ ] Repo/service/controller/router/schema Zod
- [ ] `processBudgetAlerts` ligado ao scheduler existente (sem novo setInterval)
- [ ] Idempotência por `dedupeKey` testada
- [ ] `Notification` em components.schemas + rotas no openapi
- [ ] Testes unit+integração verdes
- [ ] Specs (back features + domain-model + roadmap + front) atualizados
