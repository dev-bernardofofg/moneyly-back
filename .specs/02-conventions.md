# 02 — Convenções de Código (OBRIGATÓRIAS)

Base: `.cursor/rules/pern-back.mdc`. SOLID + Clean Code + WCAG.
**Este arquivo é a fonte única dos padrões. `04` referencia, não repete.**

## ⛔ Proibido (anti-padrões — checar sempre)

- `res.status().json()` direto → usar `ResponseHandler`.
- Regra de negócio / cálculo / query em controller → vai pro service.
- Acesso a `db` fora de repository.
- Service retornando `res` ou recebendo `req`/`res` → service só dados puros.
- `throw new Error("msg")` ou `new HttpError(status,...)` cru para erro de domínio → usar as classes semânticas de `services/errors` (`NotFoundError`, `ConflictError`, ...).
- Service importando repositório/serviço concreto dentro da factory → deps só via parâmetro (`makeXService(deps)`); singletons apenas no composition root.
- `jest.mock` de módulo em teste unit de service → injetar fakes na factory.
- Controller sem `if (!req.user)` em rota protegida.
- Validar `req.body` manualmente no controller → schema Zod + middleware `validate`.
- Persistir/comparar retorno de `toZonedTime`/`toSaoPauloTimezone` → só `spMidnight`/`spMidnightOf`/instantes reais (ver §Datas).
- `new Date(body.date)` em controller/service para dia-semântica → `parseTransactionDate`/`spMidnight`.
- `format(date, ...)` do date-fns puro para dia/mês de negócio → usa TZ do servidor; usar `spDayString`/`formatInTimeZone`.
- Repository sem `satisfies IXRepository`.
- Persistir decimal como number → `.toString()`; comparar string de decimal → `Number()`.
- Editar `openapi.json` à mão → é gerado por `pnpm openapi:gen` (zod-to-openapi). Ver `.specs/features/00-openapi-generator.md`.
- Commit sem confirmação do usuário ou com `Co-Authored-By`.
- **Feature nova fora de `src/modules/<x>/`** → estrutura modular é a regra desde `06-project-structure.md` (código legado layer-first migra por PR, não cresce).
- Use-case com mais de 1 operação de negócio, ou `services/` de módulo chamando use-case (ciclo).
- `core/` importando de `modules/`; módulo importando internals de outro módulo (só via `index.ts` público).

## SOLID aplicado

- **SRP:** controller delega tudo ao service/use-case. Zero regra de negócio em controller. Na estrutura modular: 1 use-case = 1 operação de negócio (`use-cases/<verbo>-<recurso>.use-case.ts`).
- **OCP:** feature nova = use-case novo (ou service novo no legado), não modificar existente.
- **LSP/DIP:** use-case/service depende de interface de repositório (`I*Repository`), não da implementação concreta.
- **ISP:** interfaces granulares por entidade (`IUserRepository`, `ITransactionRepository`...); na estrutura modular, a interface vive no módulo dono (`modules/<x>/repositories/interfaces.ts`).

## Resposta HTTP — sempre `ResponseHandler`

Nunca `res.status().json()` direto. Métodos: `success`, `created`, `paginated`, `notFound`, `unauthorized`, `forbidden`, `badRequest`, `serverError`, `error`.

- `success`/`created`/`paginated` **normalizam decimais** automaticamente (`normalizeDecimals` — remove `.00`, `.50→.5` em strings `^-?\d+\.\d{2}$`).
- Formato sucesso: `{ data, message? }`. Formato erro: `{ success:false, error, details? }`. Paginado: `{ success, data, pagination, message? }`.

## Erros

- Base: `HttpError(status, message, details?)` (`src/validations/errors.ts`). Em **service**, usar as subclasses semânticas de `src/services/errors` (`NotFoundError`, `ConflictError`, `UnauthorizedError`, `BadRequestError`, ...) — nunca `new HttpError(404,...)` cru. Validations (`src/validations/*.validation.ts`) podem lançar `HttpError` direto.
- Controller: `catch (error) { if (isHttpError(error)) return next(error); return ResponseHandler.error(res, "msg", error); }`.
- `errorHandler` global (`src/middlewares/error-handler.ts`) trata, nesta ordem: `status/statusCode` → `ZodError` (UUID inválido em param `id` vira **404**, resto 400) → códigos Postgres (`23503`→400 FK, `23505`→409 unique, `23514`→400 check) → JWT (`JsonWebTokenError`/`TokenExpiredError`→401) → fallback 500.
- `isHttpError` (`src/helpers/errors.ts`): checa `status` ou `statusCode` no objeto.

## Validação

- Schemas Zod em `src/schemas/*.schema.ts`.
- Aplicar via middleware genérico `src/middlewares/validate.ts`: `validateBody(schema)`, `validateParams(schema)`, `validateQuery(schema)`, `validateBodyAndParams(b,p)`. O middleware **reatribui** `req.body/params/query` com o resultado parseado (transforms aplicados).
- Valores monetários: aceitar `string | number`, `transform` para number, `.pipe(z.number().positive(...))`. Ver `createCategoryBudgetSchema`.
- Mensagens de erro Zod em **português**.
- Validações de existência/ownership: funções async em `src/validations/*.validation.ts` que lançam `HttpError(404...)`. Service chama antes de mutar (ex: `validateBudgetExists(id, userId)`).

## Auth

- `authenticateUser` (`src/middlewares/auth.ts`): lê `Authorization: Bearer <token>`, `verifyAccessToken`, `requireUser(decoded.userId)`, popula `req.user`. Tipo `AuthenticatedRequest extends Request { user?: AuthenticatedUser }`.
- Controller protegido sempre começa: `if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");`.
- Router protegido: `Router.use(authenticateUser)` no topo.

## Repository

- Objeto literal exportado: `export const xRepository = { ... } satisfies IXRepository;` + `export type { IXRepository };`.
- Só Drizzle (`db`, `eq`, `and`...). Métodos retornam entidade tipada ou `null` (`return row ?? null`). `update` seta `updatedAt: new Date()`. `delete` retorna `boolean` (`result.length > 0`).
- `insert(...).returning()` e checar — lançar `Error` genérico se falhar inserção.

## Datas / timezone — CONTRATO (obrigatório)

Princípio: **UTC no core, São Paulo nas bordas.** Helpers em `src/helpers/dates.ts`.

1. `Date` em código e banco = **instante UTC real**. Colunas são `timestamp` naive interpretadas como UTC pelo stack (drizzle) — nunca mudar essa convenção.
2. **PROIBIDO** persistir ou comparar o retorno de `toZonedTime`/`toSaoPauloTimezone`/`getCurrentSaoPauloDate` (wall-clock deslocado; existe só como legado de exibição).
3. Datas **dia-semânticas** (`transactions.date`, `recurring.startDate`/`nextExecution`, `goals.targetDate`): canonizadas na **meia-noite SP** via `spMidnight`/`parseTransactionDate`. Exceção com hora real: `overtime.startTime/endTime` (e o `transactions.date` espelhado dele).
4. Entrada da API: `'yyyy-MM-dd'` = dia SP; ISO com offset = instante. Service canoniza — controller nunca faz `new Date(body.date)`.
5. Decisão de calendário (que período contém a data, monthKey, dia de recorrência): extrair campos SP com `spDayString`/`spParts`, calcular, voltar a instante com `spMidnightOf`. "Agora" para lógica = `new Date()`.
6. Filtros de intervalo por dia: `[spMidnight(start), spEndOfDay(end)]` (fim inclusivo).
7. Recorrência: `calculateNextExecution`/`calculateFirstExecution` operam no calendário SP e retornam meia-noite SP; monthly persiste `dayOfMonth` como âncora no create (sem ela, mês curto derruba a âncora — clamp sem pulo).
8. Saída/formatação: só `formatBrazilian*`/`formatInTimeZone`.
9. **Scripts com SQL cru**: params de data sempre `toISOString()` (com `Z`) — string naive num param tipado timestamp é parseada como LOCAL pelo postgres.js (+3h silencioso). Migração de referência: `src/scripts/migrate-dates-sp-midnight.ts`.

- Período financeiro do usuário: `financialDayStart`/`financialDayEnd` (colunas em `users`); `getCurrentFinancialPeriod(start, end, instante)` aceita instante real. Fonte de verdade de agregação por período = `periodId` (FK), não date-range.

## Migrations (Drizzle)

- Schema histórico foi aplicado via `db:push`; tracking `drizzle.__drizzle_migrations` ficava vazio → `db:migrate` colidia ("relation already exists").
- **Resolvido:** `pnpm db:baseline` (`src/scripts/baseline-migrations.ts`) registra migrations do journal já existentes (hash sha256 idêntico ao drizzle + `created_at=journal.when`). Idempotente.
- Fluxo agora: `db:generate` → revisar `.sql` → `db:migrate` (limpo, idempotente). `db:push` ainda ok p/ dev rápido, mas migrate é a fonte rastreável.
- Se um ambiente novo acusar desync push/migrate, rodar `pnpm db:baseline` 1x antes do `db:migrate`.

## Idioma & commits

- Código/identificadores em inglês. Mensagens de API/erro e docs em **português**.
- Commits: Conventional Commits em inglês, 1 por feature, corpo proporcional. **Nunca commitar sem confirmação explícita do usuário. Sem `Co-Authored-By`.**
- `git user.name`: `dev-bernardofofg` / email `dev.bernardofofg@gmail.com` (verificar antes de commitar).
