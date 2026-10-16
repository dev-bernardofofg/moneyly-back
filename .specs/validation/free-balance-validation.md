# Validação do Saldo Livre

Registro diário durante dois períodos financeiros completos. O objetivo é medir se o
Saldo Livre responde, na prática, à pergunta central do produto:

> Quanto posso gastar com segurança até receber novamente?

Novas features dependem das evidências deste documento, exceto correções de defeitos ou
inconsistências.

## Como registrar

- Registre uma linha por dia, de preferência no mesmo horário.
- Anote o **Saldo Livre** exibido no dashboard antes de qualquer lançamento do dia.
- Em **Valor que eu achava**, escreva quanto você acreditava poder gastar sem olhar o app.
- **Diferença** = Saldo Livre apresentado − valor que eu achava.
- Em **Entrada ou compromisso ausente**, cite o que faltava no app (ex.: "conta de luz não
  cadastrada", "hora extra de sábado não lançada"). Use "—" se nada faltou.
- Em **Decisão**, descreva o que você fez com ajuda do Moneyly (ex.: "adiei compra",
  "aumentei orçamento de mercado"). Use "—" se não houve decisão.
- Em **Dúvida**, registre o que ficou confuso, indicando se veio da **interface** ou da
  **fórmula**.

## Período 1

- Início: `AAAA-MM-DD`
- Fim: `AAAA-MM-DD`
- Renda fixa esperada: `R$`
- Contas recorrentes cadastradas no início: `quantidade`
- Orçamentos e metas ativos no início: `quantidade`

| Data | Saldo Livre apresentado | Valor que eu achava | Diferença | Entrada ou compromisso ausente | Decisão tomada com o Moneyly | Dúvida (interface/fórmula) |
| ---- | ----------------------- | ------------------- | --------- | ------------------------------ | ---------------------------- | -------------------------- |
|      |                         |                     |           |                                |                              |                            |

### Avaliação do período 1

- **Precisão da projeção:** Saldo Livre do primeiro dia comparado com o saldo real ao fim
  do período, ignorando reservas de metas. Diferença em R$ e em %.
- **Frequência de dados ausentes:** quantos dias tiveram entrada ou compromisso ausente, e
  quais tipos se repetiram.
- **Compreensão da memória de cálculo:** o detalhamento em `/insights` bastou para entender
  o valor? Liste as dúvidas recorrentes.
- **Utilidade real para decisões:** quantas decisões foram tomadas com ajuda do app, e quais.
- **Necessidade comprovada de novos tipos de renda:** houve renda que não coube em salário,
  recorrência ou hora extra? Com que frequência e de que valor?
- **Ajustes propostos:** só os que as evidências acima sustentam.

## Período 2

- Início: `AAAA-MM-DD`
- Fim: `AAAA-MM-DD`
- Ajustes aplicados após o período 1:

| Data | Saldo Livre apresentado | Valor que eu achava | Diferença | Entrada ou compromisso ausente | Decisão tomada com o Moneyly | Dúvida (interface/fórmula) |
| ---- | ----------------------- | ------------------- | --------- | ------------------------------ | ---------------------------- | -------------------------- |
|      |                         |                     |           |                                |                              |                            |

### Avaliação do período 2

- **Precisão da projeção:**
- **Frequência de dados ausentes:**
- **Compreensão da memória de cálculo:**
- **Utilidade real para decisões:**
- **Necessidade comprovada de novos tipos de renda:**
- **Comparação com o período 1:** os ajustes melhoraram precisão ou compreensão?

## Conclusão

- A fórmula precisa de ajuste? Qual e por quê?
- Quais features entram no próximo ciclo, cada uma com a evidência que a justifica?
- O que fica fora por falta de evidência?
