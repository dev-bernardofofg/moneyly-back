# F5 — Prévias no Dashboard

**Tipo:** feature (read-only, aditivo). **Status:** spec. **Esforço:** baixo. **Schema novo:** nenhum.
**Origem:** pedido do front em `moneyly-front/.specs/features/05-dashboard-previews.md`. `/dashboard` é a home pós-login; F3/F4 são pesados → não chamar separado lá. Dobrar prévia resumida na 1 call agregada que já existe (`GET /overview/dashboard`).

## Objetivo

Estender `data` de `GET /overview/dashboard` com bloco compacto `previews` (aditivo, opcional — **não quebra** `DashboardOverview`/R1). Reusa heurísticas F3 (`groupSubscriptionCandidates`) e F4 (`buildComparison`), resumindo (sem listas completas).

## Shape (exato, fonte = spec do front)

```
data.previews: {
  subscriptions: { count: number, topMonthlyCost: number | null, topTitle: string | null },
  comparison:    { signal: "up" | "down" | "stable", deltaPct: number | null, topHighlight: string | null }
}
```

## Implementação

- Novo `getDashboardPreviewsService(userId, financialDayStart, financialDayEnd)` em `overview.service.ts`:
  - `tx = transactionRepository.findAllByUserId(userId)` — **1 só** scan pesado, reaproveitado pelas duas prévias.
  - `subs = groupSubscriptionCandidates(tx)` → `count = subs.length`; `subs[0]` (já ordenado por `monthlyCost` desc) → `topMonthlyCost`/`topTitle` (null se vazio).
  - `periods = getPreviousFinancialPeriods(start,end,4)` mapeado c/ `formatPeriodLabel`; `cmp = buildComparison(tx, periods)` → `signal=cmp.totals.signal`, `deltaPct=cmp.totals.deltaPct`, `topHighlight=cmp.highlights[0] ?? null`.
- `getDashboardOverview` controller: chama o service novo (tem `req.user.financialDayStart/End`), injeta `previews` no objeto `data` existente.
- Custo: 1 `findAllByUserId` extra por load do dashboard. v1 sem cache; **TODO**: cache por (userId, períodoAtual) se virar gargalo (chave estável — período financeiro).

## OpenAPI

- `DashboardOverviewSchema` (src/openapi/schemas.ts) ganha `previews` (objeto, campos nullable conforme shape). Regenerar `pnpm openapi:gen`. Aditivo → R1/front atual não quebram.

## Edge cases

- Sem transações → `count: 0`, `topMonthlyCost/topTitle: null`, `signal: "stable"`, `deltaPct/topHighlight: null`.
- Usuário novo (sem períodos anteriores) → comparison `deltaPct: null`, `signal: "stable"`.
- `previews` sempre presente (não opcional na resposta) — front trata nulls; simplifica tipo gerado.

## Testes

- Unit `getDashboardPreviewsService`: mock `transactionRepository.findAllByUserId`; helpers reais. Casos: vazio → nulls/stable; com 3+ cobranças mensais → `subscriptions.count`≥1 + `topTitle`; alta de categoria → `comparison.signal="up"` + `topHighlight`.
- Regressão openapi: `DashboardOverview` contém `previews` (asserts já cobrem `$ref`/components).

## DoD

- [ ] `getDashboardPreviewsService` + integração no controller `getDashboardOverview`
- [ ] `DashboardOverviewSchema.previews` no openapi, `pnpm openapi:gen`
- [ ] Testes unit verdes; suite openapi verde
- [ ] Aditivo confirmado (R1/front não quebram)
- [ ] Specs atualizados (este + roadmap F5 Back=Done); front regenera hooks
