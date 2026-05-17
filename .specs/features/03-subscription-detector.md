# F3 — Detector de Assinaturas

**Tipo:** feature (read-only). **Status:** spec. **Esforço:** médio. **Schema novo:** nenhum.
**Por quê:** anti-desperdício (trend 2026). Heurística sobre `transactions` detecta gasto recorrente NÃO cadastrado como `recurring_transactions` → sugere converter.

## Objetivo

`GET /transactions/subscriptions` — analisa histórico de despesas do usuário, agrupa por padrão recorrente (mesmo título normalizado + valor próximo + cadência ~mensal) e retorna candidatos a assinatura ainda não modelados como recorrente.

## Heurística

1. Buscar todas as transações `expense` do user (`transactionRepository.findAllByUserId`).
2. Excluir as que já têm `recurringTransactionId` (já modeladas).
3. Agrupar por chave `normalize(title)` (lowercase, trim, remove acentos/dígitos finais) **+** faixa de valor (`amount` arredondado, tolerância ±10%).
4. Para cada grupo com **≥3 ocorrências**: calcular intervalos médios entre datas (em dias). Classificar cadência: mensal (25–35), semanal (5–9), anual (350–380).
5. Só retornar grupos com cadência reconhecida e desvio baixo (intervalos consistentes).
6. Resultado por candidato: `title`, `averageAmount`, `occurrences`, `cadence`, `lastDate`, `nextEstimatedDate`, `monthlyCost` (normalizado p/ mês), `categoryId/categoryName` (categoria mais comum do grupo).

### Response (envelope `wrapSuccess`)
`data: SubscriptionCandidate[]`
```
{
  title: string,
  categoryId: string,
  categoryName: string,
  averageAmount: number,
  occurrences: number,
  cadence: "weekly" | "monthly" | "yearly",
  firstDate: string,   // ISO
  lastDate: string,
  nextEstimatedDate: string,
  monthlyCost: number  // custo mensal estimado (normaliza weekly*~4.33, yearly/12)
}
```
Ordenar por `monthlyCost` desc (maior desperdício primeiro).

## Camadas (seguir `04-feature-playbook.md`)

1. Schema DB: nenhum.
2. Repos: reusa `transactionRepository.findAllByUserId` (já retorna `TransactionWithCategory[]`).
3. Service `src/services/subscription.service.ts` → `detectSubscriptionsService(userId)`. `requireUser`. Heurística pura (testável isolada — extrair `groupSubscriptionCandidates(transactions)` em helper p/ unit sem DB).
4. Schema Zod: nenhum body/query (ou query opcional `minOccurrences` futura — v1 sem).
5. Controller `getSubscriptions` em `transaction.controller.ts` (padrão ResponseHandler/isHttpError).
6. Router: `TransactionsRouter.get("/subscriptions", getSubscriptions)` (antes de `/:id`? não há conflito — path fixo distinto).
7. OpenAPI: `SubscriptionCandidate` em `src/openapi/schemas.ts`; rota em `paths.ts` `ok(wrapSuccess(z.array(SubscriptionCandidateSchema)))`.

## Edge cases

- <3 ocorrências → ignora (ruído).
- Valor variável (ex conta de luz) → tolerância ±10%; fora disso não agrupa (evita falso positivo).
- Já modelado como recorrente → excluído por `recurringTransactionId`.
- Intervalos inconsistentes (desvio alto) → descarta grupo.
- Sem histórico → array vazio.
- Título com sufixo numérico ("Spotify 03/12") → normalização remove dígitos finais.

## Testes

- Unit `groupSubscriptionCandidates` (helper puro): 3 cobranças mensais mesmo valor → 1 candidato monthly; valores ±10% → agrupa; <3 → vazio; já com recurringTransactionId → exclui; cadência irregular → descarta.
- Integração: `GET /transactions/subscriptions` 200 + 401.
- OpenAPI: regressão router↔openapi cobre rota nova.

## Roadmap / contrato

- `moneyly/.specs/03-feature-roadmap.md`: F3 Back WIP→Done; Front consome hook gerado (lista "Possíveis assinaturas" + CTA "virar recorrente" → reusa POST /recurring-transactions).
- Front spec: `moneyly-front/.specs/features/03-subscription-detector.md`.

## DoD

- [ ] `subscription.service` + helper puro + controller + router
- [ ] `SubscriptionCandidate` no openapi, rota presente
- [ ] Testes unit (helper) + integração verdes
- [ ] Sem schema DB; read-only
- [ ] Specs (back features + roadmap + front) atualizados
