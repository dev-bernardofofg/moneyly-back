# Testes

## Início rápido

```bash
# 1. Postgres de teste (primeira vez; depois `docker start moneyly-test-db`)
docker run -d --name moneyly-test-db --restart unless-stopped \
  -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=moneyly_test \
  -p 5433:5432 postgres:16-alpine

# 2. Rodar
pnpm test:unit          # unitários, sem banco
pnpm test:integration   # HTTP real contra o banco de teste
pnpm test               # os dois
pnpm test:coverage      # com relatório em coverage/
```

`.env.test` aponta `TEST_DATABASE_URL` para `localhost:5433/moneyly_test`. O setup global
(`jest.global-setup.ts`) **apaga e recria o schema** e aplica as migrations de
`src/infra/db/migrations/` antes de cada execução. Só aceita URL em `localhost` ou banco com
nome terminado em `_test` (`setup/assert-test-database.ts`): nunca alcança dev ou produção.

## Estrutura

```
__tests__/
├── setup/
│   ├── assert-test-database.ts   # trava contra banco errado
│   ├── period-anchor.ts          # datas dentro do período atual (horas extras)
│   └── test-helpers.ts           # usuário/token fake p/ unit
├── unit/
│   ├── helpers/                  # helpers de core
│   ├── modules/<modulo>/         # espelha src/modules/<modulo>/ (use-cases, helpers)
│   └── openapi/                  # router ↔ openapi.json (regressão)
└── integration/                  # supertest contra `app`, 1 arquivo por domínio
```

Projetos Jest: `unit` (`jest.unit-setup.ts`, `DATABASE_URL` falsa: query acidental falha) e
`integration` (`jest.setup.ts` + `jest.global-setup.ts`).

## Convenções

- Títulos de `describe`/`it` em inglês; descrevem comportamento, não implementação.
- Unit: mockar repositórios/use-cases de outros módulos com `jest.mock`; sem banco.
- Integration: criar usuário via `POST /auth/sign-up` no `beforeAll` (limite de 10 sign-ups
  por processo pelo rate limit — reaproveitar usuários sem estado quando possível).
- Datas: contrato de São Paulo (ver `.specs/02-conventions.md`); horas extras usam
  `currentPeriodAnchor` para não cair no período anterior perto da meia-noite.

## Debug

```bash
node --inspect-brk node_modules/.bin/jest --selectProjects unit --runInBand <arquivo>
```
