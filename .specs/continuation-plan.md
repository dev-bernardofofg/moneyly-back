# Moneyly — Plano de Continuidade

## Objetivo

Concluir o reposicionamento do Moneyly como um copiloto financeiro para pessoas com
salário fixo e renda variável.

A pergunta central do produto é:

> Quanto posso gastar com segurança até receber novamente?

Desde o F21 a promessa é: em 5 minutos por semana, saber quanto posso gastar até receber. O **Saldo
Livre** parte do saldo real das contas e prevê só o que ainda não apareceu no extrato. A spec de
referência é `.specs/features/2026-11-05-check-in-semanal-design.md` na raiz do workspace, e o que o código
faz hoje está em `features/01-cash-flow-forecast.md`.

## Estado atual

O check-in semanal (F21) está implementado:

- `GET /overview/forecast` retorna `{ freeBalance }` sempre para hoje: saldo atual das contas, mais
  outras entradas, menos recorrentes de saída e faturas, até o dia anterior ao próximo salário;
- `nextPayment` mostra salário mais as horas extras do mês anterior, e `committedAfter` as faturas que
  vencem depois. Horas extras nunca entram no total;
- recorrências são só previsão (o cron avança `next_execution` e as parcelas, sem criar transação) e
  horas extras não criam transação;
- contas têm `data_through` e `statement_key` (migration `0018`, escrita à mão como as 0006 a 0017
  porque `db:generate` falha em um snapshot malformado da 0005). O frescor da conta é `fresh`,
  `stale` ou `empty`;
- a prévia da importação reconhece a conta pelo `accountKey` do arquivo, e a confirmação grava
  `through` em `data_through`. Chaves fracas (`:pdf`, `:unknown`) nunca são salvas;
- o lembrete `check_in_reminder` sai quando uma conta está atrasada ou vazia, no máximo um por 7 dias,
  e abre `/check-in`;
- `pnpm db:reset-user <email> [--confirm]` recomeça os dados financeiros de um usuário;
- `GET /overview/planner` saiu. Os módulos e as tabelas de orçamento e meta continuam no back; o front
  não os usa mais.

A decisão de congelar a fórmula até a validação, tomada antes do F21, foi substituída por esse design.

## Localização dos repositórios

- Backend: `D:\Aprendizado\moneyly\moneyly-back`
- Frontend: `D:\Aprendizado\moneyly\moneyly-front`

Pontos iniciais para a Fase 1:

- `moneyly-back/package.json`;
- `moneyly-back/jest.global-setup.ts`;
- `moneyly-back/jest.global-teardown.ts`;
- `moneyly-back/drizzle.config.ts`;
- `moneyly-back/.env.test` — consultar sem documentar credenciais;
- `moneyly-back/src/infra/db/migrations/`;
- `moneyly-back/__tests__/integration/`.

## Princípios para a continuação

- Não duplicar regras financeiras no frontend.
- Reutilizar o contrato `freeBalance` e os use cases existentes.
- Trabalhar uma fase por vez e verificar antes de avançar.
- Preservar alterações não relacionadas nos dois repositórios.
- Não adicionar integração bancária, IA generativa, multi-carteira ou novos tipos de renda
  antes da validação prática.
- Tratar horas extras como uma fonte de renda variável, não como a identidade do produto.

### Decisão de escopo (2026-10-16)

Importação de extrato **OFX** (`POST /transactions/import/preview` + `POST /transactions/import`)
entrou antes da validação, por decisão do produto. Não é integração bancária: o usuário baixa o
arquivo no banco e envia; não há credencial, agregador nem Open Finance. Na validação, registrar
se o dado ausente veio de algo que a importação teria trazido. Integração automática (Pluggy,
Belvo, Open Finance) continua bloqueada até a evidência.

### Decisão de escopo (2026-10-16): multi-carteira

Contas e cartões (F12, `.specs/features/12-accounts-and-cards.md`) entraram antes da validação,
por decisão do produto. Compra no cartão conta no período em que a fatura vence; o pagamento da
fatura não é despesa. Isso muda **quando** gastos de cartão pesam no Saldo Livre: na validação,
registrar se o valor por período ficou mais próximo do que o usuário esperava.

## Fase 1 — Estabilizar banco e testes integrados

### Problema atual

O banco Neon usado pelos testes está desatualizado e não contém todas as tabelas de
overtime. Além disso, `drizzle-kit push` encontra conflitos que exigem interação e pode
encerrar com código `0` mesmo sem aplicar o schema.

### Implementação

1. Criar ou resetar uma base Neon exclusiva para testes.
2. Garantir que todas as migrations, incluindo overtime, estejam aplicadas.
3. Substituir o setup dependente de `drizzle-kit push` por migrations não interativas.
4. Validar explicitamente que a URL aponta para o ambiente de testes antes de qualquer
   limpeza ou reset.
5. Garantir encerramento das conexões e timers após Jest.

### Testes integrados necessários

- CRUD de empresas;
- CRUD de horas extras;
- criação, atualização e exclusão de hora extra sem tocar em transações;
- recorrências avançando `next_execution` sem criar transação;
- `GET /overview/forecast` retornando todo o contrato de `freeBalance`;
- autenticação obrigatória para os endpoints envolvidos.

### Critérios de aceite

- `pnpm test:integration` executa sem prompt interativo;
- todos os testes passam a partir de um banco previsível;
- Jest encerra sem aviso de handles abertos;
- nenhuma operação de reset pode atingir banco de desenvolvimento ou produção.

## Fase 2 — Remover a busca provisória de período

### Objetivo

Consultar um período diretamente no PostgreSQL, sem carregar todos os períodos do usuário
e filtrar em memória.

### Implementação

1. Adicionar `findByIdAndUserId(periodId, userId)` à interface do repositório de períodos.
2. Implementar a consulta com os dois filtros no repositório Drizzle.
3. Consumir o método no service/use case correspondente.
4. Remover o filtro provisório em
   `moneyly-back/src/modules/user/user.router.ts`.

### Cenários de teste

- período existente e pertencente ao usuário;
- período inexistente;
- período pertencente a outro usuário;
- repositório não deve retornar dados de outro usuário.

### Critérios de aceite

- a consulta ocorre diretamente no banco;
- período inexistente ou de outro usuário retorna `404`;
- os endpoints atuais mantêm o mesmo contrato.

## Fases 3 a 5 — substituídas pelo F21

Planner com impacto no Saldo Livre, detalhamento acionável em `/insights` e onboarding de 5 etapas foram
entregues antes do F21 e depois redesenhados. Hoje: não há planner nem reservas; `/insights` aparece como
"Gastos" e explica o Saldo Livre pelos quatro componentes do contrato; o onboarding tem 3 etapas (renda e
ciclo, primeiras recorrentes e prévia do Saldo Livre). Detalhes em `features/01-cash-flow-forecast.md` e
nas specs do front.

## Fase 6 — Validação durante dois períodos financeiros

Registrar em `validation/free-balance-validation.md` uma linha por check-in, comparando o Saldo Livre
exibido com o saldo real das contas. Ao fim de cada período, avaliar:

- precisão da projeção;
- frequência de dados ausentes;
- compreensão da memória de cálculo;
- utilidade real para decisões;
- necessidade comprovada de novos tipos de renda.

Novas features devem depender das evidências coletadas, exceto correções de defeitos ou
inconsistências.

## Ordem de execução

1. Estabilizar banco e testes integrados.
2. Remover a busca provisória de período.
3. Aplicar a virada do F21: publicar back e front, fazer backup, rodar `pnpm db:reset-user <email>`
   sem `--confirm` e conferir as contagens, rodar com `--confirm`, informar o saldo inicial de cada
   conta e reimportar faturas e extratos. O usuário faz o backup e executa o script, que nunca roda em
   CI contra produção.
4. Validar durante dois períodos financeiros, um registro por check-in.
5. Ajustar a fórmula somente com base nos resultados da validação.
6. Tarefa separada, depois da virada: remover as tabelas e os módulos de orçamento e meta e as colunas
   `overtime_records.transaction_id` e `transactions.overtime_record_id`.

## Verificação

### Backend

```powershell
pnpm openapi:gen
pnpm build
pnpm test:unit
pnpm test:integration
```

### Frontend

```powershell
pnpm generate-hooks
pnpm type-check
pnpm test
pnpm build
```

## Prompt de handoff para o Claude Code

```text
Continue o Moneyly a partir do check-in semanal (F21).

Leia primeiro:
- .specs/features/2026-11-05-check-in-semanal-design.md (raiz do workspace)
- moneyly-back/.specs/features/01-cash-flow-forecast.md
- moneyly-back/.specs/validation/free-balance-validation.md

O Saldo Livre vem do back e o front só exibe. Não duplique regras financeiras no frontend.

Antes de editar:
1. confira git status nos dois repositórios;
2. preserve alterações não relacionadas;
3. identifique os testes proporcionais à mudança.

Não implemente integração bancária, IA generativa nem novos tipos de renda antes da validação de dois
períodos, e não remova orçamentos e metas dentro de outra tarefa.
```
