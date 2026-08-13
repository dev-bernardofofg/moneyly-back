# F11 — Notificação de transação criada + payload rico no push

**Tipo:** feature (gatilho em request, sem endpoint novo). **Status:** feito. **Schema novo:** nenhum (enum TS).
**Por quê:** o usuário precisa de feedback imediato ao lançar entrada/saída, e o push precisa carregar rota, ícone e `relatedId` para o SW do front.

## Objetivo

1. Estender o data-only do FCM com `url`, `relatedId`, `icon`, `image`, `badge`.
2. Ao criar uma transação (income ou expense), gerar notificação in-app + push informando título, valor e data.

## Push visual

`resolvePushVisual(type, relatedId)` em `modules/notification/helpers/push-visual.ts`. `dispatchNotification` aplica no `sendPushToUser`. Campos vazios não entram no `data` (FCM só aceita string).

## Gatilho

- `createTransactionUseCase` — toda criação (manual, recorrente, backfill).
- `createOvertimeUseCase` — a income gerada pela hora extra (não passa pelo use-case de transação).
- try/catch + logger: falha de notificação **nunca** quebra o lançamento.

## Notificação

`notifyTransactionCreated` (`type: transaction_income | transaction_expense`, `severity: info`, `relatedId: transactionId`):

- Entrada: title `Entrada: <título>` · message `Você registrou uma entrada de R$ <valor> em <dd/MM/yyyy> (<título>).`
- Saída: title `Saída: <título>` · message `Você registrou uma saída de R$ <valor> em <dd/MM/yyyy> (<título>).`
- `dedupeKey = transaction:<transactionId>`

## Exposição

Nenhum endpoint novo. `NotificationSchema` ganha os types + `pnpm openapi:gen`. Front regenera hooks.

## Testes

- Unit `notify-transaction-created`: income vs expense, dedupe.
- Unit `push-visual` + `dispatchNotification`: url/icon/relatedId no push.
- Unit `createTransactionUseCase`: chama notify; income não dispara spending alert; falha de notify não rejeita.
- Unit overtime: chama notify após criar a income.
