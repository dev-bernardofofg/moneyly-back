# 06 — Estrutura Modular do Projeto (alvo)

**Tipo:** infra / arquitetural. **Status:** ✅ **migração 100% concluída e validada** — todos os módulos em `src/modules/`; overview quebrado em use-cases; aliases `@core/@modules/@infra` ativos; pastas layer-first extintas; erros e validações genéricas em `core/`.
**Validação:** 224 testes unit + 100 integração verdes (Postgres via Docker); build `tsc && tsc-alias` limpo (0 aliases no `dist`); bundle esbuild do `@vercel/node@5.8` resolve os aliases nativamente (deploy Vercel OK — sem plugin); smoke test HTTP real (`/health` 200, auth 401, `sign-up` end-to-end até o banco).
**Base:** estrutura do `serverJB` (NestJS), adaptada para Express + Drizzle.
**Regra de transição:** feature nova nasce na estrutura modular; módulo existente migra incrementalmente (strangler), 1 módulo por PR.

## Por quê

A estrutura atual é **layer-first** (`src/controllers/`, `src/services/`, `src/repositories/`...): para entender uma feature é preciso abrir 6+ pastas. O serverJB organiza **module-first**: tudo de um domínio vive junto (`src/modules/<domínio>/`), e o transversal fica isolado em `core/` e `infra/`. Benefícios:

- **Coesão:** mexer em budgets = 1 pasta. Deleta-se/extrai-se um domínio inteiro sem caça-arquivos.
- **Use-cases:** 1 operação de negócio por arquivo, em vez de services-deus com 8 funções (`goal.service.ts` hoje mistura CRUD, status, milestones).
- **Fronteira explícita:** `core/` não conhece `modules/`; módulo não importa internals de outro módulo (só sua interface pública via `index.ts`).

## O que transfere do serverJB (e o que não)

| serverJB (NestJS)                                               | Moneyly (Express)                                                                               |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/modules/<x>/` com dto, use-cases, repositories, validators | ✅ igual (dto → `schemas/` Zod)                                                                 |
| `src/core/` (configs, middlewares, helpers, providers)          | ✅ igual                                                                                        |
| `src/infra/` (base de persistência)                             | ✅ `infra/db/` (schema Drizzle, migrations, conexão)                                            |
| Controller → Use-Case → (Repository \| Service \| Mapper)       | ✅ igual, sem DI: use-case = função exportada                                                   |
| Aliases `@core/*`, `@modules/*`, `@infra/*`                     | ✅ (ver §Tooling)                                                                               |
| Testes fora de `src/` espelhando módulos                        | ✅ já é assim; reorganizar por módulo                                                           |
| DI/`@Injectable`, Modules Nest, Guards/Interceptors/Pipes       | ❌ não transfere — equivalentes já existem (middlewares Express, `ResponseHandler`, `validate`) |
| class-validator DTOs                                            | ❌ Zod continua (fonte do openapi)                                                              |
| Base repos Mongoose (`FindOneMongooseRepository`...)            | ❌ Drizzle é query-builder; repositório por módulo `satisfies I*Repository` continua            |

## Estrutura alvo

```
src/
├── core/                          # transversal — NUNCA importa de modules/
│   ├── config/
│   │   └── env.ts                 # (hoje src/env/)
│   ├── middlewares/               # auth, validate, error-handler, security, sanitize, auto-period-creation
│   ├── helpers/                   # response-handler, errors, dates, pagination, token, bcrypt
│   ├── lib/                       # logger, axios-instance
│   └── openapi/                   # registry, envelopes, generate (paths ficam nos módulos)
├── infra/
│   └── db/
│       ├── schema.ts              # tabelas Drizzle (globais por natureza do ORM)
│       ├── migrations/
│       └── index.ts               # conexão/db
├── modules/
│   └── <dominio>/
│       ├── index.ts               # interface pública do módulo (o que outros módulos podem usar)
│       ├── <x>.router.ts          # monta rotas, aplica middlewares
│       ├── <x>.controller.ts      # HTTP fino: extrai req, chama use-case, ResponseHandler
│       ├── <x>.paths.ts           # registro openapi do módulo (importado por core/openapi/generate)
│       ├── schemas/               # Zod (request); 1 arquivo por recurso ou operação
│       ├── use-cases/             # 1 operação de negócio por arquivo
│       │   └── create-<x>.use-case.ts   # export async function createXUseCase(...)
│       ├── services/              # utilitários stateless compartilhados entre use-cases (opcional)
│       ├── repositories/
│       │   ├── <x>.repository.ts  # satisfies IXRepository
│       │   └── interfaces.ts      # I*Repository do módulo
│       ├── validations/           # existência/ownership → HttpError
│       └── helpers/               # lógica pura testável do domínio (ex: subscription-detector)
├── routes.ts                      # agrega <x>.router de cada módulo
└── server.ts                      # entrypoint local + scheduler
api/index.ts                       # entrypoint Vercel (inalterado)
```

### Módulos do Moneyly

`auth` · `user` · `transaction` · `category` · `budget` · `goal` · `overview` (dashboard/planner/insights/forecast/comparative) · `recurring-transaction` · `notification` (+ bill-reminder) · `subscription` (detector F3 + convert F10; rotas continuam montadas nos routers de transaction/recurring) · `overtime` (companies + records) · `financial-period` (interno, sem router).

### Regras da camada use-case

- Nome: `<verbo>-<recurso>.use-case.ts`, exporta **uma** função `async <verbo><Recurso>UseCase(...)`.
- Toda regra de negócio vive aqui (o que hoje é uma função do `*.service.ts`). Migração é mecânica: 1 função exportada do service → 1 use-case.
- Use-case pode chamar: repositórios (via interface), validations, helpers, services do módulo, use-cases de **outro** módulo via `index.ts` público (ex: goal → `notifyGoalMilestones` do notification).
- `services/` do módulo: utilitário stateless usado por ≥2 use-cases. **Nunca chama use-case** (evita ciclo — regra do serverJB).
- Jobs de scheduler são use-cases (`process-bill-reminders.use-case.ts`) — `server.ts` importa via `index.ts` do módulo.

### O que NÃO muda

`ResponseHandler`, `HttpError`/`isHttpError`, middleware `validate` + Zod, padrões Drizzle (`satisfies`, decimais string, timezone SP), scheduler, envelope de resposta, geração openapi (`pnpm openapi:gen`) — só mudam de endereço. `02-conventions.md` continua sendo a fonte dos padrões.

## Mapeamento atual → alvo

| Hoje                                                          | Alvo                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/controllers/x.controller.ts`                             | `src/modules/x/x.controller.ts`                               |
| `src/services/x.service.ts` (N funções)                       | `src/modules/x/use-cases/*.use-case.ts` (N arquivos)          |
| `src/repositories/x.repository.ts`                            | `src/modules/x/repositories/x.repository.ts`                  |
| `src/repositories/interfaces/IXRepository.ts` (+ index gordo) | `src/modules/x/repositories/interfaces.ts`                    |
| `src/routes/x.router.ts`                                      | `src/modules/x/x.router.ts`                                   |
| `src/schemas/x.schema.ts`                                     | `src/modules/x/schemas/`                                      |
| `src/validations/x.validation.ts`                             | `src/modules/x/validations/`                                  |
| `src/helpers/` (dates, pagination...)                         | `src/core/helpers/`                                           |
| `src/helpers/subscription-detector.ts` (domínio!)             | `src/modules/subscription/helpers/`                           |
| `src/middlewares/`                                            | `src/core/middlewares/`                                       |
| `src/lib/`                                                    | `src/core/lib/` (seed-categories → `modules/category/`)       |
| `src/env/`                                                    | `src/core/config/env.ts`                                      |
| `src/openapi/paths.ts` (monolítico)                           | `src/modules/<x>/<x>.paths.ts` + agregador em `core/openapi/` |
| `src/db/`                                                     | `src/infra/db/`                                               |
| `src/types/x.types.ts`                                        | dentro do módulo dono                                         |
| `__tests__/unit/services/x.service.test.ts`                   | `__tests__/unit/modules/<x>/use-cases/*.test.ts`              |

## Tooling (aliases e build)

Aliases `@core/*`, `@modules/*`, `@infra/*` — **ativos e validados**:

1. `tsconfig.json`: `baseUrl: "."` + `paths` (`@core/*`→`src/core/*`, etc.).
2. Dev (`ts-node-dev`): `-r tsconfig-paths/register` no script `dev`.
3. Build (`tsc && tsc-alias`): `tsc-alias` reescreve os aliases para relativos no `dist` (`tsc` sozinho não faz). Confirmado: 0 aliases no `dist`.
4. Jest: `moduleNameMapper` (`@core/(.*)`→`<rootDir>/src/core/$1`, idem modules/infra).
5. **Vercel (`api/index.ts`):** o `@vercel/node@5.8` bundla com esbuild, que resolve `tsconfig paths` **nativamente** (sem plugin). Validado com bundle local: aliases inlinados, 0 require externo `@core/...`.
6. `openapi:gen`/scripts (`tsx`): `tsx` lê o `tsconfig.json` da raiz e resolve os paths automaticamente.

> **Convenção de uso:** import cross-boundary (módulo→core, módulo→outro módulo, →infra) usa alias; import dentro da mesma área (mesmo módulo, core→core) fica relativo. Isso mantém o alias como sinal visual de "estou cruzando fronteira".

## Plano de migração (strangler)

1. **PR 0 — fundação:** criar `core/` + `infra/db/` (git mv de middlewares, helpers, lib, env, db), ajustar imports, `drizzle.config`, jest. Zero mudança de comportamento.
2. **PR 1 — piloto pequeno:** módulo `notification` (recém-mexido, 3 endpoints + 2 jobs). Valida o formato de use-cases/paths por módulo.
3. **PRs seguintes:** 1 módulo por PR, do menor para o maior: `overtime` → `budget` → `goal` → `subscription` → `recurring-transaction` → `category` → `user`/`auth` → `financial-period` → `transaction` → `overview`.
4. Cada PR: `git mv` (preserva history) → quebra service em use-cases → move testes → `pnpm openapi:gen` (deve gerar idêntico) → typecheck + testes.
5. Feature nova durante a migração: nasce em `src/modules/`, mesmo que dependa de código legado (importa dos paths antigos até o módulo dependido migrar).

### Critério de pronto (por módulo)

- [ ] Nada do domínio resta em `src/{controllers,services,repositories,routes,schemas,validations}`
- [ ] Use-cases 1-operação com testes movidos/renomeados
- [ ] `<x>.paths.ts` no módulo, openapi gerado sem diff de contrato
- [ ] `index.ts` exporta só o que outro módulo/`server.ts` realmente usa
