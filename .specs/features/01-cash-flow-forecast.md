# F1 / F21 — Saldo Livre

**Tipo:** feature (read-only). **Status:** Done. **Schema novo:** nenhum no endpoint; o F21 acrescenta
`accounts.data_through` e `accounts.statement_key` (migration `0018`) e `bill_payment_outflows`
(migration `0019`).
**Design:** `.specs/features/2026-11-05-check-in-semanal-design.md` na raiz. Esta spec descreve o que o
código faz hoje.

## Objetivo

Responder "quanto posso gastar até receber?". O banco é a fonte do dinheiro real: o app parte do saldo
das contas e só prevê o que ainda não apareceu no extrato. Sem persistir nada.

## Endpoint

`GET /overview/forecast`

- Auth: bearer. Não aceita `periodId`: calcula sempre para hoje (São Paulo).
- Resposta (envelope `wrapSuccess`): `data: { freeBalance }`.
- `GET /overview/planner` foi removido. As reservas de orçamento e de meta saíram da fórmula.

```
freeBalance: {
  total: number,
  until: string,                 // ISO
  confidence: 'high' | 'medium' | 'low',
  components: {
    accountsBalance: number,
    otherIncome: number,
    recurringExpense: number,
    cardBills: number
  },
  nextPayment: { date: string, salary: number, overtime: number, total: number } | null,
  committedAfter: number
}
```

Valores em centavos. `GET /accounts` expõe `dataThrough` e `freshness`: `fresh` até 7 dias depois de
`data_through`, `stale` depois disso, `empty` quando `data_through` é nulo (`account/helpers/freshness.ts`).

## Fórmula

Implementação: `overview/use-cases/get-free-balance.use-case.ts` e helpers puros em
`overview/helpers/free-balance.ts`.

```
total = saldo atual das contas
      + outras entradas até o próximo salário
      − recorrentes de saída até o próximo salário
      − faturas não pagas que vencem até o próximo salário
```

- **Salário:** recorrência de entrada, mensal e ativa, de maior valor com uma ocorrência futura
  (`findSalary`). As demais recorrências de entrada são "outras entradas".
- **Janela:** de hoje até o dia anterior ao próximo salário. O salário fica fora, e `until` é a data
  dele. Sem salário, a janela termina no último dia do período financeiro atual e `nextPayment` é nulo.
- **Saldo atual:** soma de `currentBalance` das contas correntes ativas. Conta sem saldo inicial fica
  fora e derruba a confiança.
- **Saldo informado:** vale como saldo no fim do dia de `opening_balance_date`. Transações,
  transferências e saídas de pagamento de fatura só contam com data posterior a ela.
- **Pagamento de fatura:** não é despesa, mas tira dinheiro da conta corrente. Toda linha
  `bill_payment` confirmada num extrato de conta corrente grava uma saída em `bill_payment_outflows`,
  única por `(user_id, external_id)`, mesmo sem cartão identificado, e `currentBalance` a subtrai.
  No extrato do cartão a linha só marca a fatura. Marcar a fatura à mão não move dinheiro. Saída não
  entra em realizado, estatísticas nem insights, e a prévia trata o `external_id` dela como `imported`.
- **Recorrência prevista:** ocorrência posterior a `data_through` da conta dela (hoje, se nulo) e
  anterior ao fim da janela. Em conta corrente vale a data mais recente entre `data_through` e
  `opening_balance_date`, porque o saldo informado já contém o que aconteceu até ali. Nunca é anterior
  a `start_date` e respeita as parcelas restantes (`recurring-transaction/helpers/occurrences.ts`).
  Recorrência sem conta usa a conta padrão.
- **Salário atrasado no extrato:** salário com data já passada e posterior a `data_through` é uma
  ocorrência prevista, então conta como entrada até o extrato chegar.
- **Fatura:** transações importadas do ciclo somadas às recorrências de cartão previstas para ele. Fatura
  paga (`card_bill_payments`) fica fora.
- **Fatura vencida:** não paga conta enquanto o vencimento for hoje ou depois, ou posterior à cobertura
  de conta corrente, porque o dinheiro ainda aparece no saldo. Cobertura é o maior
  `max(data_through, opening_balance_date)` entre as contas correntes ativas; sem nenhuma, vale hoje.
  Depois disso fica fora, porque o histórico pode não ter marcação de pagamento.
- **Próximo pagamento:** salário somado às horas extras do mês anterior ao do salário
  (`overtimeMonthForSalary`).
- **Já comprometido (`committedAfter`):** faturas não pagas que vencem no dia do próximo salário ou depois.
- **Horas extras** nunca entram no total. Elas aparecem em `nextPayment` e passam a contar quando o
  salário chega ao saldo, sem casar hora extra com o crédito do extrato.
- **Confiança:** `low` sem salário, sem contas ou com conta corrente sem saldo inicial; `medium` com
  alguma conta, inclusive cartão, que não esteja `fresh`; `high` nos demais casos.
- Dinheiro arredondado em centavos.

Recorrências são só previsão. O cron diário avança `next_execution` e `executed_installments` e não
cria transação, e a criação de uma recorrência também não cria. Horas extras não criam, sincronizam nem
removem transação.

## Camadas

`overview.router.ts` → `getForecast` (`overview.controller.ts`) → `getFreeBalanceUseCase`. Leitura de
contas por `listAccountsUseCase`, recorrências por `recurringTransactionRepository`, faturas por
`transactionRepository.sumCardExpensesByPeriod` e `cardBillPaymentRepository`, horas por
`overtimeRepository`. `currentBalance` vem de `listAccountsUseCase`, que soma transações e transferências
e subtrai `billPaymentOutflowRepository.sumAfter`. Schema OpenAPI do `ForecastResponse` em
`src/core/openapi/schemas.ts`.

## Validação

Mudanças na fórmula dependem do registro em `.specs/validation/free-balance-validation.md`: uma linha por
check-in, comparando o Saldo Livre com o saldo real.

## Histórico

A versão anterior (F1) fechava o Saldo Livre por período financeiro: somava realizado, recorrências
materializadas, horas extras pendentes e descontava reservas de orçamento e de meta, com o impacto no
planner. Esse desenho foi substituído no F21 porque dependia de lançamentos que o usuário parou de
alimentar.

## Testes

- Unit: fórmula, janela, confiança e frescor (`overview/helpers`, `account/helpers`).
- Integração: `GET /overview/forecast` e a importação com `data_through` e `statement_key`.
- OpenAPI: o teste de regressão router↔openapi cobre a rota.
