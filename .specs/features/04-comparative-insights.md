# F4 — Insights Comparativos

**Tipo:** feature (read-only). **Status:** spec. **Esforço:** médio. **Schema novo:** nenhum.
**Por quê:** trend 2026 (insights AI sobre dados). Estende análise: comparativo por categoria vs média histórica + frases acionáveis ("Restaurante +40% vs sua média").

## Decisão de contrato

NÃO mexer no `FinancialInsights` existente (`/overview/insights`) — não quebrar contrato já consumido pelo front (R4). **Novo endpoint** `GET /overview/insights/comparison`.

## Objetivo

Comparar o período atual com a média dos N períodos anteriores (default 3), por categoria e agregado, gerando deltas + sinais (`up`/`down`/`stable`) e mensagens prontas.

### Response (envelope `wrapSuccess`)
`data: ComparativeInsights`
```
{
  basis: { periodsCompared: number, currentPeriod: { startDate, endDate, label } },
  totals: {
    currentExpense: number,
    averageExpense: number,      // média dos períodos anteriores
    deltaPct: number | null,     // (cur-avg)/avg*100; null se avg=0
    signal: "up" | "down" | "stable"
  },
  byCategory: Array<{
    categoryId: string,
    categoryName: string,
    currentExpense: number,
    averageExpense: number,
    deltaPct: number | null,
    signal: "up" | "down" | "stable",
    message: string              // ex "Restaurante 40% acima da sua média"
  }>,
  highlights: string[]           // top 3 mensagens mais relevantes (maior |deltaPct|)
}
```
`signal`: |deltaPct| < 10 → stable; >0 → up; <0 → down. `up` em despesa = ruim (front colore).

## Heurística

1. `transactionRepository.findAllByUserId` (expense).
2. Resolver período atual + N anteriores via `getPreviousFinancialPeriods` (helper `financial-period.ts`) usando `user.financialDayStart/End`.
3. Agrupar despesa por categoria por período. `current` = período atual; `average` = média dos N anteriores (categorias ausentes contam 0).
4. deltaPct por categoria e total. Montar mensagens PT. `highlights` = top 3 por |deltaPct| com ocorrência relevante (ignorar categorias com avg≈0 e valor baixo p/ não poluir).

## Camadas (seguir `04-feature-playbook.md`)

1. Schema DB: nenhum.
2. Repos: `transactionRepository.findAllByUserId`, `userRepository.findById` (dias do período).
3. Service `src/services/comparative-insights.service.ts` → `getComparativeInsightsService(userId, periodsBack=3)`. Extrair núcleo puro `buildComparison(transactions, periods)` p/ unit sem DB.
4. Schema Zod: query opcional `periodsBack` (`z.coerce.number().int().min(1).max(12).optional()` no contrato; runtime tolerante).
5. Controller `getComparativeInsights` em `overview.controller.ts`.
6. Router: `OverviewRouter.get("/insights/comparison", validate({query}), getComparativeInsights)`.
7. OpenAPI: `ComparativeInsights` em `schemas.ts` + rota em `paths.ts`.

## Edge cases

- Sem períodos anteriores (usuário novo) → `averageExpense=0`, `deltaPct=null`, `signal=stable`, `highlights=[]`.
- Categoria só no atual (nova) → avg 0, deltaPct null, mensagem "novo gasto em X".
- Categoria sumiu (só no passado) → current 0, delta -100%, signal down.
- avg muito baixo (<1) → não gerar highlight (evita "+999%").
- Período cruza meses → usar helpers São Paulo (não mês civil).

## Testes

- Unit `buildComparison` puro: alta de categoria; categoria nova; categoria sumida; sem histórico; cálculo de signal/threshold 10%; highlights top-3 ordenados.
- Integração: `GET /overview/insights/comparison` + `?periodsBack=6`, 401.
- OpenAPI: regressão router↔openapi.

## Roadmap / contrato

- `moneyly/.specs/03-feature-roadmap.md`: F4 Back WIP→Done; Front: cards comparativos em `/insights` (setas + cores por signal).
- Front spec: `moneyly-front/.specs/features/04-comparative-insights.md`.
- Não altera `FinancialInsights` — aditivo.

## DoD

- [ ] `comparative-insights.service` + helper puro + controller + router + Zod query
- [ ] `ComparativeInsights` no openapi, rota presente
- [ ] Testes unit (helper) + integração verdes
- [ ] `/overview/insights` original intacto (sem breaking)
- [ ] Specs (back features + roadmap + front) atualizados
