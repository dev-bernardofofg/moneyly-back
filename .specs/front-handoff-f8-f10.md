# Handoff para o Front — F8 / F9 / F10

Contexto para quem trabalha no `moneyly-front` (dev ou assistente). O back ganhou 3 features
na branch `feat/engagement-features` (moneyly-back). Este doc explica **o que mudou no
contrato da API e o que o front precisa construir**. Specs completos do back em
`moneyly-back/.specs/features/07..09`.

## TL;DR do contrato

1. `Notification.type` deixou de ser só `"budget_alert"` — agora é
   `"budget_alert" | "bill_reminder" | "goal_milestone"`. Shape da notificação não mudou.
2. Endpoint novo: `POST /recurring-transactions/from-subscription` (converte candidato do
   detector de assinaturas em transação recorrente).
3. `openapi.json` regenerado (não versionado — rodar `pnpm openapi:gen` no back e
   `pnpm api:generate` no front para atualizar tipos/hooks Kubb/Orval).

## Semântica de `Notification.relatedId` por tipo

| `type`           | `relatedId` aponta para  | `periodId`        | `severity`                |
| ---------------- | ------------------------ | ----------------- | ------------------------- |
| `budget_alert`   | `budgetId`               | período do alerta | `info`/`warning`/`danger` |
| `bill_reminder`  | `recurringTransactionId` | `null`            | sempre `info`             |
| `goal_milestone` | `goalId`                 | `null`            | sempre `info`             |

`relatedId` pode apontar para registro já deletado (notificação é histórico) — tratar como
opaco/best-effort ao navegar.

## F8 — Lembrete de contas a vencer (`bill_reminder`)

**O que o back faz:** scheduler horário detecta despesas recorrentes ativas com vencimento
nos próximos 3 dias e cria a notificação. Idempotente — 1 por (recorrente, data de vencimento).

**O que o front faz:** nada para gerar — só renderizar. `GET /notifications` já retorna.

- `title`: `Conta a vencer: <título>` · `message` já vem pronta em pt-BR
  (`Netflix de R$ 55,90 vence em 2 dias (05/07).`).
- Sugestão de UI: ícone de calendário/vencimento, distinto do alerta de orçamento.

## F9 — Milestone de meta atingido (`goal_milestone`)

**O que o back faz:** quando `POST /goals/:id/add-amount` cruza um marco (25/50/75/100%),
cria 1 notificação por marco recém-atingido, na mesma request (síncrono). Um aporte grande
pode cruzar vários marcos de uma vez → várias notificações. Nunca repete um marco.

**O que o front faz:**

- Após sucesso do `add-amount`, invalidar a query de notificações (a notificação já existe
  quando a resposta chega).
- 100% tem título `Meta concluída: <título>` — bom gatilho para UI de celebração.
- A resposta do `add-amount` continua a mesma (goal + milestones + progress) — dá para
  detectar o marco cruzado pela própria resposta se quiser toast imediato sem esperar
  a lista de notificações.

## F10 — Converter assinatura em recorrente

**Fluxo de UX:** na tela de assinaturas detectadas (`GET /transactions/subscriptions`),
botão "Converter em recorrente" por candidato.

**Endpoint:** `POST /recurring-transactions/from-subscription` → `201` com a recorrente criada.

**Mapeamento candidato → body** (1:1, tudo vem do `SubscriptionCandidate`):

| Body                | Vem de                        | Tipo                                |
| ------------------- | ----------------------------- | ----------------------------------- |
| `title`             | `candidate.title`             | string 1..100                       |
| `amount`            | `candidate.averageAmount`     | number ou string > 0                |
| `categoryId`        | `candidate.categoryId`        | uuid                                |
| `cadence`           | `candidate.cadence`           | `"weekly" \| "monthly" \| "yearly"` |
| `nextEstimatedDate` | `candidate.nextEstimatedDate` | string ISO datetime                 |
| `description`       | opcional                      | string ≤500                         |

**Erros a tratar:**

- `409` — já existe recorrente ativa com o mesmo título (normalizado: case/acentos/sufixo
  numérico ignorados). Exibir a `error` da API.
- `400` — categoria inexistente (FK).

**Comportamentos que afetam a UI:**

- O back **avança a data de início para o futuro** se `nextEstimatedDate` já passou — a
  primeira cobrança será lançada na data agendada, nunca imediatamente (evita duplicar a
  despesa que gerou a detecção). Vale mostrar "próxima cobrança em dd/MM" com a
  `nextExecution` retornada.
- Após sucesso: invalidar queries de recorrentes **e** de assinaturas detectadas. Atenção:
  o candidato pode continuar aparecendo no detector (a heurística olha transações antigas,
  que não ganham vínculo retroativo). Mitigação no front: esconder candidatos cujo título
  bate com recorrente ativa, ou aceitar até as próximas execuções criarem o vínculo.

## Checklist front

- [ ] Atualizar union de `Notification.type` (regenerar hooks resolve).
- [ ] Render de `bill_reminder` e `goal_milestone` na central de notificações.
- [ ] Toast/celebração pós add-amount (opcional).
- [ ] Botão "Converter em recorrente" na lista de assinaturas + tratamento de 409.
- [ ] Invalidations: notifications (pós add-amount), recurring + subscriptions (pós conversão).
