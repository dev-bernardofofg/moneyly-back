# F9 — Alertas de Milestone de Meta

**Tipo:** feature (gatilho em request, sem endpoint novo). **Status:** spec. **Esforço:** baixo. **Schema novo:** nenhum.
**Por quê:** `goal_milestones` já marca `isReached`/`reachedAt` (em `checkMilestones`, goal.repository), mas nada avisa o usuário. Fechar o loop: cruzou 25/50/75/100% → notificação.

## Objetivo

Ao adicionar valor a uma meta (`POST /goals/:id/add-amount`), gerar 1 notificação por milestone **recém-atingido**. Idempotente para sempre: `dedupeKey = goal:<goalId>:milestone:<percentage>`.

## Gatilho

No `addAmountToGoalService` (goal.service.ts) — não no repository (camada errada para regra de notificação):

```
before  = goalRepository.findMilestonesByGoalId(goalId)   // snapshot
updated = goalRepository.addAmount(goalId, amount)         // já marca isReached internamente
after   = goalRepository.getGoalWithMilestones(goalId)
newly   = after.milestones onde isReached && !before[mesmo id].isReached
notifyGoalMilestones(userId, goal, newly)                  // try/catch + logger — falha de
                                                           // notificação NUNCA quebra o add-amount
```

## Notificação

`notifyGoalMilestones` em `notification.service.ts` (módulo já centraliza geração de alertas):

- `type: "goal_milestone"` · `severity: "info"` · `relatedId: goalId` · `periodId: null`.
- 25/50/75: title `Meta <title>: <pct>% atingido` · message `Você já poupou R$ <current> dos R$ <target> da meta "<title>".`
- 100: title `Meta concluída: <title>` · message `Parabéns! Você atingiu os R$ <target> da meta "<title>".`
- `findByDedupeKey` antes de criar + catch 23505 (padrão F2).

## Decisões

- **Só no caminho `add-amount`** — consistente com o comportamento atual de `checkMilestones` (update manual de `currentAmount` via `PUT /goals/:id` não marca milestone hoje; não mudar isso aqui).
- Vários milestones cruzados num único aporte (ex: 0→80%) → notifica todos (25, 50, 75) de uma vez.

## Exposição

Nenhum endpoint novo. `NotificationSchema` ganha o type `goal_milestone` (junto com F8) + `pnpm openapi:gen`.

## Testes

- Unit em `notification.service.test.ts`: cria p/ milestone novo; dedupe → skip; 100% usa título de conclusão.
- Unit em `goal.service.test.ts`: aporte que cruza 2 milestones → notifica 2; falha na notificação não rejeita o service.
