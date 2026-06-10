# F8 — Lembrete de Contas a Vencer

**Tipo:** feature (scheduler, sem endpoint novo). **Status:** spec. **Esforço:** baixo. **Schema novo:** nenhum (extensão de enum TS).
**Por quê:** o scheduler horário já processa `recurring_transactions` e `notifications` já tem `dedupeKey` idempotente. Falta avisar o usuário ANTES da cobrança — o alerta mais pedido em apps de finanças. Só liga fios entre módulos existentes.

## Objetivo

Notificar o usuário quando uma transação recorrente `expense` ativa tem `nextExecution` nos próximos **3 dias**. 1 notificação por (recorrente, data de execução) — quando a recorrente executa, `nextExecution` avança e a próxima ocorrência gera novo `dedupeKey` naturalmente.

## Sem migration

`notifications.type` é coluna `text` sem CHECK no Postgres (ver `0004_happy_veda.sql`) — o enum vive só no TypeScript. Extensão: `['budget_alert', 'bill_reminder', 'goal_milestone']` em `src/db/schema.ts` (F9 entra junto).

## Geração (scheduler)

Novo `src/services/bill-reminder.service.ts`:

```
processBillReminders():
  now   = getCurrentSaoPauloDate()
  until = now + 3 dias (REMINDER_WINDOW_DAYS)
  due   = recurringTransactionRepository.findUpcomingExpenses(now, until)
          // isActive=true AND type='expense' AND nextExecution ∈ (now, until]
  para cada recurring:
    dedupeKey = `bill:<recurringId>:<yyyy-MM-dd de nextExecution em SP>`
    se findByDedupeKey existe → skip
    create notification:
      type: "bill_reminder" · severity: "info"
      title: `Conta a vencer: <title>`
      message: `<title> de R$ <amount> vence em <N> dia(s) (<dd/MM>).`
      relatedId: recurring.id · periodId: null
    catch 23505 (corrida do scheduler) → warn + continue, resto propaga (padrão F2)
```

- Varredura global (1 query, todos os usuários) — diferente do F2 que itera por usuário, porque aqui o dado já carrega `userId`.
- Repo novo método: `findUpcomingExpenses(from, to)` em `recurring-transaction.repository.ts` + interface.
- `src/server.ts`: adicionar ao mesmo `setInterval` 1h + startup (padrão `processBudgetAlerts`).

## Exposição

Nenhum endpoint novo — `GET /notifications` já lista. Atualizar `NotificationSchema` (src/openapi/schemas.ts) com o novo `type` + `pnpm openapi:gen`.

## Edge cases

- Recorrente com `nextExecution` já vencida (≤ now) → fora da janela; é papel do `processRecurringTransactions`, não do lembrete.
- Recorrente desativada/deletada após notificação → notificação permanece (histórico), `relatedId` pode apontar para registro inexistente — front já trata `relatedId` como opaco.
- `income` recorrente não gera lembrete (só `expense`).

## Testes

- Unit `__tests__/unit/services/bill-reminder.service.test.ts` (mock repos): cria p/ expense na janela; dedupe existente → skip; corrida 23505 → não propaga; income/fora da janela → não notifica.
