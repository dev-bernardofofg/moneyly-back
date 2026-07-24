# F10 — Converter Assinatura Detectada em Recorrente

**Tipo:** feature (write, 1 endpoint). **Status:** spec. **Esforço:** baixo. **Schema novo:** nenhum.
**Por quê:** F3 (`GET /transactions/subscriptions`) detecta candidatos mas não tem ação — o usuário vê "Netflix R$ 55/mês" e precisa recriar a recorrente na mão. Este endpoint fecha o loop: 1 clique no front converte o candidato.

## Endpoint

`POST /recurring-transactions/from-subscription` — router `recurring-transaction.router.ts` (auth bearer).

### Body (`fromSubscriptionSchema`, recurring-transaction.schema.ts)

```
{
  title: string (1..100),
  amount: string|number → positive,        // averageAmount do candidato
  categoryId: uuid,
  cadence: "weekly" | "monthly" | "yearly",  // nomes do F3, mapeiam 1:1 p/ frequency
  nextEstimatedDate: string ISO datetime,    // do candidato
  description?: string (≤500)
}
```

### Response

`201` envelope `wrapSuccess(RecurringTransactionSchema)` — a recorrente criada.
`409` se já existe recorrente **ativa** do usuário com mesmo título normalizado.

## Regras (service `convertSubscriptionToRecurringService`, subscription.service.ts)

1. **Anti-duplicata:** `normalizeTitle(input.title)` (helper do F3) vs títulos das recorrentes ativas do usuário → match → `HttpError 409 "Já existe uma transação recorrente ativa com este título."`
2. **Sem dupla contagem:** `createRecurringTransactionService` cria transação imediata quando `startDate ≤ hoje`. A última cobrança real JÁ está em `transactions` (foi ela que gerou a detecção). Logo: avançar `nextEstimatedDate` com `addCadence` (exportar do helper F3) até ficar **estritamente futura** → usar como `startDate`.
3. **Derivação:** `frequency = cadence`; `dayOfMonth = startDate.getDate()` (monthly); `dayOfWeek = startDate.getDay()` (weekly); yearly sem dia fixo.
4. `type` fixo `"expense"` (assinatura é despesa por definição do F3).
5. Delega criação a `createRecurringTransactionService` (reuso total — períodos futuros, nextExecution etc. já resolvidos lá). Categoria inexistente → FK 23503 → 400 pelo errorHandler global (mesmo comportamento do POST normal).

> Transações antigas do grupo NÃO ganham `recurringTransactionId` retroativo — efeito colateral desejado: o candidato some da lista do F3 (a heurística exclui grupos já modelados só pelas futuras? não — exclui por transação; as antigas continuam sem vínculo, mas as novas executadas terão, e o front pode esconder candidatos cujo título bate com recorrente ativa). v2 se incomodar.

## Camadas

- Schema Zod: `fromSubscriptionSchema` em `recurring-transaction.schema.ts`.
- Service: `convertSubscriptionToRecurringService` em `subscription.service.ts`.
- Controller: `createRecurringFromSubscription` em `recurring-transaction.controller.ts` (asyncHandler).
- Router: `POST /from-subscription` ANTES das rotas `/:id`.
- OpenAPI: registrar em `src/openapi/paths.ts` (teste de regressão router↔openapi obriga) + `pnpm openapi:gen`.

## Testes

- Unit (mock repos/service): título duplicado ativo → 409; `nextEstimatedDate` passada → startDate avançada p/ futuro; monthly deriva `dayOfMonth`; weekly deriva `dayOfWeek`.
- Integração (`insights-features.test.ts` ou novo): cria candidato via transactions → POST from-subscription → 201 + recorrente listada; segundo POST → 409.
