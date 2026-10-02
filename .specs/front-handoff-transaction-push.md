# Handoff front — push de transação criada

Escopo fechado: só **comunicação do push** quando uma entrada ou saída é criada.
Registro de device (FID) já deve estar funcionando. Deep-link fino / imagens / outros tipos ficam pra depois.

## O que o back faz

Ao criar transação (manual, recorrente ou hora extra), o back:

1. Cria notificação in-app (`GET /notifications`).
2. Envia push **data-only** (FCM) para os devices registrados do usuário.

Falha de push **não** quebra a criação da transação.

## Tipos novos

| `type`                | Quando                         |
| --------------------- | ------------------------------ |
| `transaction_income`  | Entrada criada                 |
| `transaction_expense` | Saída criada                   |

Union completa do `Notification.type` (OpenAPI já regenerado):

`budget_alert` | `bill_reminder` | `goal_milestone` | `spending_alert` | `transaction_income` | `transaction_expense`

Regenerar client no front: `pnpm api:generate` (a partir do `openapi.json` do back).

## Texto que chega

### Entrada

- `title`: `Entrada: <título>`
- `body`: `Você registrou uma entrada de R$ <valor> em <dd/MM/yyyy> (<título>).`

### Saída

- `title`: `Saída: <título>`
- `body`: `Você registrou uma saída de R$ <valor> em <dd/MM/yyyy> (<título>).`

Exemplo saída:

```json
{
  "title": "Saída: Almoço",
  "body": "Você registrou uma saída de R$ 45,50 em 13/08/2026 (Almoço).",
  "type": "transaction_expense",
  "url": "/transactions?id=22222222-2222-2222-2222-222222222222",
  "relatedId": "22222222-2222-2222-2222-222222222222",
  "notificationId": "<uuid da notificação>",
  "icon": "/icons/expense.png",
  "badge": "/icons/badge.png"
}
```

Entrada usa `icon: /icons/income.png` e `url` no mesmo formato.

## Payload data-only (SW)

Todos os valores são **string**. Campos que o front precisa ler agora:

| campo            | uso no front                                      |
| ---------------- | ------------------------------------------------- |
| `title`          | título da notificação                             |
| `body`           | corpo                                             |
| `type`           | distinguir entrada/saída na UI                    |
| `url`            | rota do clique (`/transactions?id=<id>`)          |
| `relatedId`      | id da transação                                   |
| `notificationId` | id da notificação in-app (opcional)               |
| `icon`           | ícone (`/icons/income.png` ou `/icons/expense.png`) |
| `badge`          | `/icons/badge.png`                                |

`image` **não** vem neste escopo.

## O que o front precisa fazer (mínimo)

1. No SW (`onBackgroundMessage`): montar a notificação com `title`, `body`, `icon`, `badge` e `data.url`.
2. No `notificationclick`: abrir `data.url` (ex.: `/transactions?id=...`).
3. Em foreground (`onMessage`): toast/inbox — **sem** `showNotification` se a UI já mostra.
4. Na central de notificações: renderizar `transaction_income` / `transaction_expense` (ícone distinto entrada vs saída).
5. Colocar assets em `public/icons/`:
   - `income.png`
   - `expense.png`
   - `badge.png` (opcional; fallback ok)

## Fora de escopo (depois)

- Ajustar deep-link fino (`/transactions/[id]` vs query).
- Imagem grande (`image`) no push.
- UX especial de clique por tipo além do `url` que já vem.
- Polimento visual dos outros tipos (`budget_alert`, etc.).

## Critério de pronto

- Criar uma saída → push com título `Saída: ...` e valor no body.
- Criar uma entrada → push com título `Entrada: ...`.
- Clique (background) abre `/transactions?id=<id>`.
- Inbox lista os dois tipos novos sem quebrar.
