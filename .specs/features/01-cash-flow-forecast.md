# F1 — Saldo Projetado e Saldo Livre

**Tipo:** feature (read-only). **Status:** Done. **Esforço:** baixo. **Schema novo:** nenhum.
**Por quê:** tendência 2026 #1 (forecast preditivo). Reusa `recurring_transactions` + `financial_periods` + `transactions`. Responde "quanto vou ter no fim do período" sem o usuário simular na mão.

## Objetivo

Endpoint que projeta o saldo até o fim do período financeiro selecionado (ou atual), combinando:

- saldo realizado: transações já existentes no período;
- entradas/saídas futuras: ocorrências de `recurring_transactions` ativas com `nextExecution` dentro da janela `[hoje, period.endDate]`;
- renda mensal (`users.monthlyIncome`) ainda não materializada, se aplicável.

Sem persistir nada. Cálculo determinístico em São Paulo (helpers de `financial-period.ts`/`dates.ts`).

## Endpoint

`GET /overview/forecast?periodId=<uuid?>`

- Auth: bearer. Router: `overview.router.ts` (já tem `authenticateUser` + `ensurePeriodExists`).
- `periodId` opcional (ausente = período atual via `financialPeriodService.ensureCurrentPeriodExists`).

### Response (envelope `wrapSuccess`)

`data: ForecastResponse`

```
{
  period: { id, startDate, endDate, label },
  realized: {
    income: number,        // soma income já lançado no período
    expense: number,       // soma expense já lançado
    balance: number        // income - expense
  },
  projected: {
    recurringIncome: number,   // recorrentes income que ainda vão executar até endDate
    recurringExpense: number,
    occurrences: Array<{       // detalhe das ocorrências futuras previstas
      recurringTransactionId: string,
      title: string,
      type: "income" | "expense",
      amount: number,
      date: string             // ISO, ocorrência prevista
    }>
  },
  projectedEndBalance: number, // inclui renda variável pendente
  freeBalance: {
    total: number,             // disponível após compromissos e reservas
    daysRemaining: number,
    confidence: "low" | "medium" | "high",
    income: { fixed, variable, pendingVariable },
    commitments: { recurringExpenses },
    reserves: { budgets, goals },
    components: {
      realizedBalance,
      futureRecurringIncome,
      futureRecurringExpense,
      pendingVariableIncome,
      budgetReserve,
      goalReserve
    }
  },
  asOf: string                 // ISO, agora (São Paulo)
}
```

> Dinheiro derivado = `number` (consistente com stats/insights existentes; ver `02-conventions.md`).

## Camadas (seguir `04-feature-playbook.md`)

1. **Schema DB:** nenhum.
2. **Repos:** reusa `transactionRepository.findByPeriodId`, `recurringTransactionRepository` (listar ativas do user), `financialPeriodService.getPeriodById`/`ensureCurrentPeriodExists`.
3. **Validações:** período existe/pertence ao user (404 se `periodId` inválido).
4. **Service:** `src/services/forecast.service.ts` → `getForecastService(userId, periodId?)`.
   - `requireUser`.
   - Resolve período (igual `getUserBudgetsService`).
   - `realized` = reduce das transações do período por tipo.
   - Projeção: para cada recorrente ativa, gerar datas de execução de `nextExecution` até `period.endDate` via `calculateNextExecution` (helper `dates.ts`), respeitando `frequency`/`dayOfMonth`/`dayOfWeek` e `totalInstallments`/`executedInstallments` (não projetar além das parcelas restantes). Não duplicar ocorrência já materializada (transação com `recurringTransactionId` + mesma data já contada em `realized`).
   - Somar, montar `projectedEndBalance`.
5. **Schema Zod (request):** `forecastQuerySchema` em `src/schemas/overview.schema.ts` (`periodId: z.string().uuid().optional()`).
6. **Controller:** `getForecast` em `overview.controller.ts` (padrão: `if(!req.user)`, try/catch, `isHttpError→next`, `ResponseHandler.success`).
7. **Router:** `OverviewRouter.get("/forecast", validateQuery(forecastQuerySchema), getForecast)`.
8. **OpenAPI:** registrar `ForecastResponse` em `src/openapi/schemas.ts` + rota em `paths.ts` (`ok: ok(wrapSuccess(ForecastResponseSchema))`). `pnpm openapi:gen`. Teste regressão router↔openapi pega a rota nova automaticamente.

## Edge cases

- Sem recorrentes ativas → `projected.*` zerado, `projectedEndBalance == realized.balance`.
- `nextExecution` já passou (overdue) mas dentro do período → conta como ocorrência prevista (1x) — alinhar com lógica de `processRecurringTransactions` p/ não divergir.
- Recorrente com `totalInstallments` esgotando no meio do período → projetar só as parcelas restantes.
- Período no passado (histórico) → `projected` vazio (nada futuro); `realized` = fechamento real.
- `monthlyIncome`: decidir se entra na projeção (renda fixa não-lançada). **Decisão:** v1 NÃO injeta `monthlyIncome` automático (evita dupla contagem com recorrente income). Documentar; reavaliar em F4.
- Recorrências já materializadas no mesmo dia não entram novamente na projeção.
- Horas extras com transação vinculada já pertencem ao realizado; registros sem transação
  entram como renda variável pendente.
- A reserva de orçamento exclui contas recorrentes da mesma categoria para evitar dupla
  contagem. A reserva de metas é proporcional aos ciclos restantes até a data-alvo.

## Fórmula do Saldo Livre

Implementação: `get-forecast.use-case.ts` + helpers puros em `overview/helpers/free-balance.ts`.

```
total = realizedBalance
      + futureRecurringIncome
      + pendingVariableIncome
      − futureRecurringExpense
      − budgetReserve
      − goalReserve
```

- `realizedBalance`: receitas − despesas das transações do período (inclui recorrências
  materializadas e horas extras com transação vinculada).
- `futureRecurring*`: ocorrências com data > agora e ≤ `period.endDate`, sem as já materializadas e
  limitadas às parcelas restantes.
- `pendingVariableIncome`: horas extras do período sem transação vinculada.
- `budgetReserve`: por orçamento, `max(0, restante − contas futuras previstas na categoria)`.
- `goalReserve`: por meta não concluída, `restante / ceil(dias até a data-alvo / dias do período)`
  (mínimo 1 período).
- `confidence`: `high` com renda fixa prevista e orçamento; `medium` com alguma renda; senão `low`.
- Dinheiro arredondado em centavos.

Mudanças na fórmula dependem do registro em `.specs/validation/free-balance-validation.md`.

## Planner — impacto no Saldo Livre

`GET /overview/planner?periodId=<uuid?>`, com a mesma validação do forecast (`400` para uuid
inválido, `404` para período de outro usuário). As reservas vêm do próprio `getForecastUseCase`, sem
recálculo, então planner e forecast nunca divergem no mesmo período.

- `currentPeriod` passou a ser o período selecionado e ganhou `id`.
- Campo novo `freeBalanceImpact: { budgetReserve, goalReserve, total }`.

## Testes

- Unit `forecast.service`: mock repos. Casos: só realizado; realizado + 1 recorrente mensal dentro da janela; recorrente com parcelas esgotando; período passado; periodId inválido → 404.
- Integração: `GET /overview/forecast` com/sem `periodId`, 401 sem token.
- OpenAPI: rota presente + `data.$ref = ForecastResponse` (regressão já cobre presença).

## Roadmap / contrato

- `moneyly/.specs/03-feature-roadmap.md`: F1 Back WIP→Done quando mergeado; Front consome `getOverviewForecast` gerado.
- Front spec: `moneyly-front/.specs/features/01-cash-flow-forecast.md` (dashboard, insights, planner e onboarding).

## DoD

- [x] `forecast.service` + controller + router + schema Zod
- [x] `ForecastResponse` em components.schemas, rota no openapi
- [x] Testes unit+integração verdes
- [x] Specs (back features + roadmap + front) atualizados
- [x] Sem schema DB novo; sem persistência
