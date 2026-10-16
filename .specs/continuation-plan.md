# Moneyly — Plano de Continuidade

## Objetivo

Concluir o reposicionamento do Moneyly como um copiloto financeiro para pessoas com
salário fixo e renda variável.

A pergunta central do produto é:

> Quanto posso gastar com segurança até receber novamente?

O **Saldo Livre** deve responder essa pergunta considerando movimentações realizadas,
entradas futuras, contas recorrentes, orçamento, metas e horas extras.

## Estado atual

O primeiro ciclo técnico está implementado:

- `GET /overview/forecast` retorna `freeBalance` com valor, dias restantes, confiança,
  renda fixa e variável, compromissos, reservas e memória de cálculo;
- recorrências materializadas não são contabilizadas novamente;
- horas extras são integradas como renda variável no período financeiro;
- o dashboard apresenta o Saldo Livre como informação principal;
- o contrato OpenAPI e os clientes gerados do frontend estão sincronizados;
- existem testes unitários no backend e testes de componente no frontend;
- middleware, metadata, manifest, README e especificações refletem o novo posicionamento.

Ainda faltam refinamentos de produto, infraestrutura de integração e validação prática.

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
- criação de hora extra gerando transação de receita;
- atualização de hora extra sincronizando a transação;
- exclusão de hora extra removendo a transação;
- exclusão direta da transação desvinculando a hora extra;
- materialização de recorrências sem dupla contagem no forecast;
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

## Fase 3 — Conectar Planner e Saldo Livre

### Objetivo

Mostrar como orçamentos e metas afetam o valor disponível no período selecionado.

### Backend

1. Permitir `periodId` em `GET /overview/planner`.
2. Validar o `periodId` com o mesmo padrão do forecast.
3. Reutilizar `getBudgetProgressUseCase(userId, periodId)`.
4. Expor separadamente:
   - reserva restante de orçamento;
   - contribuição recomendada para metas no ciclo;
   - impacto total no Saldo Livre.
5. Atualizar OpenAPI e testes.

### Frontend

1. Enviar o período selecionado na consulta do planner.
2. Exibir uma seção “Impacto no Saldo Livre”.
3. Separar reserva de orçamento e reserva de metas.
4. Após mutações em orçamento ou metas, invalidar:
   - planner;
   - forecast;
   - dashboard.
5. Cobrir loading, erro e ausência de orçamento/metas.

### Critérios de aceite

- planner e forecast usam o mesmo período financeiro;
- alterar orçamento ou meta atualiza o Saldo Livre;
- nenhuma fórmula é recalculada no componente visual.

## Fase 4 — Tornar Insights acionáveis

### Objetivo

Explicar por que o Saldo Livre mudou e o que o usuário pode fazer.

### Implementação

1. Criar um detalhamento do Saldo Livre em `/insights`.
2. Exibir saldo realizado, entradas futuras, renda variável pendente, contas futuras e
   reservas.
3. Renderizar as ocorrências futuras relevantes.
4. Gerar mensagens determinísticas a partir do contrato, por exemplo:
   - “Suas contas futuras consomem R$ X.”
   - “R$ Y estão reservados para orçamento e metas.”
   - “Horas extras adicionaram R$ Z à renda do período.”
5. Evitar IA generativa: mensagens devem ser previsíveis e testáveis.
6. Reutilizar a action/hook da página e manter componentes visuais sem regra de negócio.

### Critérios de aceite

- o usuário consegue reconstruir mentalmente o valor exibido;
- valores negativos indicam claramente o motivo;
- loading, erro, período histórico e ausência de previsões estão cobertos;
- testes validam comportamento, não detalhes internos.

## Fase 5 — Evoluir o onboarding

### Objetivo

Fazer o novo usuário fornecer dados suficientes para receber uma projeção útil.

### Etapas sugeridas

1. Renda e ciclo de pagamento.
2. Primeiras contas recorrentes.
3. Primeiro orçamento.
4. Meta financeira opcional.
5. Prévia do primeiro Saldo Livre.

### Regras

- reutilizar formulários e endpoints existentes;
- permitir pular etapas opcionais;
- não criar novas tabelas apenas para o wizard;
- preservar o progresso local enquanto o dialog estiver aberto;
- não bloquear o acesso caso o usuário escolha configurar depois;
- concluir com uma explicação curta do Saldo Livre.

### Critérios de aceite

- o usuário pode concluir apenas a configuração mínima;
- etapas opcionais podem ser ignoradas;
- existem estados de submissão, erro e conclusão;
- o dashboard recebe dados úteis imediatamente após o onboarding.

## Fase 6 — Validação durante dois períodos financeiros

Criar `.specs/validation/free-balance-validation.md` e registrar diariamente:

- Saldo Livre apresentado;
- valor que o usuário acreditava poder gastar;
- diferença entre os valores;
- entrada ou compromisso ausente;
- decisão tomada com ajuda do Moneyly;
- dúvida causada pela interface ou pela fórmula.

Ao final de cada período, avaliar:

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
3. Conectar Planner e Saldo Livre.
4. Tornar Insights acionáveis.
5. Evoluir o onboarding.
6. Validar durante dois períodos financeiros.
7. Ajustar a fórmula somente com base nos resultados da validação.

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
Continue o reposicionamento do Moneyly como copiloto financeiro para pessoas com salário
fixo e renda variável.

Leia primeiro:
- moneyly-back/.specs/continuation-plan.md
- moneyly-back/.specs/features/01-cash-flow-forecast.md
- moneyly-front/.specs/features/01-cash-flow-forecast.md

Implemente uma fase por vez, seguindo a ordem do plano. Comece estabilizando o banco e os
testes integrados. Reutilize o contrato freeBalance existente e não duplique regras
financeiras no frontend.

Antes de editar:
1. confira git status nos dois repositórios;
2. preserve alterações não relacionadas;
3. identifique os testes proporcionais à fase.

Ao concluir cada fase:
1. execute testes focais;
2. execute type-check/build aplicável;
3. atualize este documento somente se uma decisão de escopo mudar;
4. relate arquivos alterados, verificações e bloqueios reais.

Não implemente integração bancária, IA generativa, multi-carteira ou novos tipos de renda
antes da validação de dois períodos.
```
