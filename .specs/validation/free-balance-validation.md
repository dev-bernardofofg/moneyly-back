# Validação do Saldo Livre

Registro de uma linha por check-in durante dois períodos financeiros completos. O objetivo é medir se o
Saldo Livre responde, na prática, à pergunta central do produto:

> Quanto posso gastar com segurança até receber novamente?

Novas features dependem das evidências deste documento, exceto correções de defeitos ou
inconsistências. Depois de dois períodos, os registros orientam ajustes na fórmula.

## Como registrar

A cada check-in concluído, acrescente uma linha na tabela do período:

- **Data**: dia do check-in.
- **Saldo Livre**: valor mostrado na tela final do check-in, depois da importação.
- **Saldo real**: soma dos saldos das contas correntes nos bancos, no mesmo momento.
- **Diferença**: Saldo Livre menos saldo real. Não é erro por si só: o Saldo Livre desconta o que vence
  até o próximo salário.
- **Faltou ou sobrou**: o que o app não sabia (conta de luz sem recorrência, conta com dados atrasados) ou
  previu errado. Use "—" se nada.
- **Dúvida**: o que ficou confuso, indicando se veio da **interface** ou da **fórmula**.

## Período 1

- Início: `AAAA-MM-DD`
- Fim: `AAAA-MM-DD`

| Data | Saldo Livre | Saldo real | Diferença | Faltou ou sobrou | Dúvida (interface/fórmula) |
| ---- | ----------- | ---------- | --------- | ---------------- | -------------------------- |
|      |             |            |           |                  |                            |

### Avaliação do período 1

- **Precisão da projeção:** Saldo Livre do primeiro check-in comparado com o que de fato sobrou no
  dia anterior ao salário. Diferença em R$ e em %.
- **Dados ausentes:** quantos check-ins tiveram algo faltando, e quais tipos se repetiram.
- **Compreensão da memória de cálculo:** o detalhamento em `/insights` bastou para entender o valor?
- **Necessidade comprovada de novos tipos de renda:** houve renda que não coube em salário, recorrência
  ou hora extra?
- **Ajustes propostos:** só os que as evidências acima sustentam.

## Período 2

- Início: `AAAA-MM-DD`
- Fim: `AAAA-MM-DD`
- Ajustes aplicados após o período 1:

| Data | Saldo Livre | Saldo real | Diferença | Faltou ou sobrou | Dúvida (interface/fórmula) |
| ---- | ----------- | ---------- | --------- | ---------------- | -------------------------- |
|      |             |            |           |                  |                            |

### Avaliação do período 2

- **Precisão da projeção:**
- **Dados ausentes:**
- **Compreensão da memória de cálculo:**
- **Necessidade comprovada de novos tipos de renda:**
- **Comparação com o período 1:** os ajustes melhoraram precisão ou compreensão?

## Conclusão

- A fórmula precisa de ajuste? Qual e por quê?
- Quais features entram no próximo ciclo, cada uma com a evidência que a justifica?
- O que fica fora por falta de evidência?
