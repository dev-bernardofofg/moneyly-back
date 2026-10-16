# F12 — Contas e cartões (multi-carteira)

**Status:** Done (back + front). **Esforço:** alto. **Schema novo:** `accounts` +
`transactions.account_id`.

## Objetivo

O usuário cadastra de onde o dinheiro sai: conta corrente e cartões de crédito. Cada
transação pertence a uma conta, e a categoria continua sendo o "o quê" dentro dela. Exemplo:
"Cartão Inter" com Transporte, Alimentação e Lazer dentro.

Compra no cartão pesa no Saldo Livre **no período da fatura**, não no dia da compra.

## Decisões de produto (2026-10-16)

- Multi-carteira entra antes da validação de dois períodos, por decisão do produto.
- Compra no cartão conta no período em que a fatura **vence** (modelo Mobills/Organizze).
- Transações existentes migram para uma "Conta principal" criada por usuário. Toda transação
  passa a ter conta.
- O pagamento da fatura **não é despesa**: no cartão, o crédito "PAGAMENTO ON LINE" e, na conta
  corrente, o débito "PAGAMENTO FATURA" são marcados `bill_payment` e não são importados por
  padrão. As compras do cartão já representam esse dinheiro.

## Entidade `accounts`

| Campo      | Tipo      | Notas                                                    |
| ---------- | --------- | -------------------------------------------------------- |
| id         | uuid PK   |                                                          |
| userId     | uuid FK   | cascade delete                                           |
| name       | text      | não nulo; único por usuário entre ativas                 |
| type       | text enum | `checking` \| `credit_card`                              |
| closingDay | integer   | 1–31; obrigatório se `credit_card`, nulo se `checking`   |
| dueDay     | integer   | 1–31; obrigatório se `credit_card`, nulo se `checking`   |
| isDefault  | boolean   | exatamente uma por usuário; recebe lançamentos sem conta |
| isActive   | boolean   | soft-delete; conta com transações não é apagada          |
| createdAt  | timestamp |                                                          |
| updatedAt  | timestamp |                                                          |

`transactions.account_id uuid NOT NULL` → FK `accounts.id` (restrict).

## Regra da fatura (compra no cartão)

Dia da compra em São Paulo `d`, fechamento `c`, vencimento `v`:

1. Mês da fatura `M` = mês da compra se `d < c`; senão, mês seguinte.
2. Vencimento = dia `v` de `M` se `v > c`; senão, dia `v` de `M + 1`. Dia além do fim do mês
   usa o último dia (`spMidnightOf` já faz isso).
3. `transactions.periodId` = período financeiro que contém o **vencimento**. `transactions.date`
   continua sendo a data da compra (exibição e detecção de duplicatas).

Exemplo: fechamento 25, vencimento 5. Compra em 10/09 → fatura fecha 25/09 → vence 05/10 → entra
no período de outubro.

Mudar `closingDay`/`dueDay` de um cartão recalcula `periodId` das transações dele.

Para conta corrente nada muda: `periodId` = período da `date`.

## Efeitos no restante do sistema

- **Forecast/Saldo Livre:** sem mudança de fórmula. Como o `periodId` do cartão já aponta para o
  período da fatura, `findByPeriodId` traz as compras no período certo.
- **Orçamentos e insights:** seguem o `periodId`, então também passam a contar compras do cartão
  no período da fatura.
- **Recorrências, horas extras e lançamentos sem conta informada:** vão para a conta padrão.
- **Importação:** o usuário escolhe a conta antes de enviar o arquivo; as linhas entram nela.

## API

- `GET/POST /accounts`, `PUT/DELETE /accounts/:id` (delete = soft; recusa a conta padrão).
- `POST /transactions/create` e `PUT /transactions/:id`: `accountId` opcional (default: conta
  padrão).
- `GET /transactions/` e `/export`: filtro `accountId`.
- `POST /transactions/import`: `accountId` obrigatório.
- `Transaction` no contrato ganha `account: { id, name, type }`.

## Front

- Tela de contas e cartões (CRUD; cartão pede fechamento e vencimento).
- Formulário de transação: seletor de conta (default: conta padrão).
- `/transactions`: filtro por conta e coluna de conta. Filtrar por um cartão mostra as
  categorias "dentro" dele.
- Importar extrato: seletor de conta obrigatório.

## Migração (`0010`)

1. Cria `accounts`.
2. Para cada usuário: insere "Conta principal" (`checking`, `isDefault = true`).
3. Adiciona `transactions.account_id` nulo, preenche com a conta principal do dono, torna
   `NOT NULL` e cria a FK.
4. Novos usuários: a conta principal é criada sob demanda (`ensureDefault`) na primeira listagem de contas ou na primeira transação; o índice único parcial evita duplicar em requisições concorrentes.

Rollback: remover a FK e a coluna, depois a tabela. Nenhum dado de transação é alterado além
da coluna nova.

## Fora do escopo (v1)

- Limite do cartão, fatura em aberto/paga, juros.
- Saldo por conta e transferências entre contas.
- Recorrência associada a cartão.
- Detectar a conta automaticamente pelo arquivo importado.

## Testes

- Unit: regra da fatura (antes/depois do fechamento, vencimento no mesmo mês ou no seguinte,
  fim de mês curto).
- Integração: CRUD de contas, conta padrão no sign-up, transação no cartão cai no período da
  fatura, forecast conta a compra no período da fatura, importação exige conta, pagamento de
  fatura na conta corrente vem marcado `bill_payment`.
