# 02 — Convenções de Código (OBRIGATÓRIAS)

Base: `.cursor/rules/pern-back.mdc`. SOLID + Clean Code + WCAG.
**Este arquivo é a fonte única dos padrões. `04` referencia, não repete.**

## ⛔ Proibido (anti-padrões — checar sempre)

- `res.status().json()` direto → usar `ResponseHandler`.
- Regra de negócio / cálculo / query em controller → vai pro service.
- Acesso a `db` fora de repository.
- Service retornando `res` ou recebendo `req`/`res` → service só dados puros.
- `throw new Error("msg")` para erro de domínio → usar `HttpError(status,...)`.
- Controller sem `if (!req.user)` em rota protegida.
- Validar `req.body` manualmente no controller → schema Zod + middleware `validate`.
- `new Date()` cru para período/data de negócio → helpers São Paulo.
- Repository sem `satisfies IXRepository`.
- Persistir decimal como number → `.toString()`; comparar string de decimal → `Number()`.
- Editar `openapi.json` à mão → é gerado por `pnpm openapi:gen` (zod-to-openapi). Ver `.specs/features/00-openapi-generator.md`.
- Commit sem confirmação do usuário ou com `Co-Authored-By`.

## SOLID aplicado

- **SRP:** controller delega tudo ao service. Zero regra de negócio em controller.
- **OCP:** feature nova = service novo, não modificar existente.
- **LSP/DIP:** service depende de interface de repositório (`src/repositories/interfaces/I*`), não da implementação concreta.
- **ISP:** interfaces granulares por entidade (`IUserRepository`, `ITransactionRepository`...).

## Resposta HTTP — sempre `ResponseHandler`

Nunca `res.status().json()` direto. Métodos: `success`, `created`, `paginated`, `notFound`, `unauthorized`, `forbidden`, `badRequest`, `serverError`, `error`.

- `success`/`created`/`paginated` **normalizam decimais** automaticamente (`normalizeDecimals` — remove `.00`, `.50→.5` em strings `^-?\d+\.\d{2}$`).
- Formato sucesso: `{ data, message? }`. Formato erro: `{ success:false, error, details? }`. Paginado: `{ success, data, pagination, message? }`.

## Erros

- Classe única: `HttpError(status, message, details?)` — duas cópias: `src/validations/errors.ts` e `src/services/errors/index.ts` (usar conforme imports do módulo vizinho).
- Service lança `HttpError`. Controller: `catch (error) { if (isHttpError(error)) return next(error); return ResponseHandler.error(res, "msg", error); }`.
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

## Datas / timezone

- Tudo em **America/Sao_Paulo**. Helpers em `src/helpers/dates.ts` e `src/helpers/financial-period.ts`.
- Criar data: `createNormalizedSaoPauloDate(year, month0-11, day)` — normaliza dia inválido para último dia do mês.
- Período financeiro do usuário: `financialDayStart`/`financialDayEnd` (colunas em `users`). Lógica em `getCurrentFinancialPeriod`.

## Migrations (Drizzle)

- Schema histórico foi aplicado via `db:push`; tracking `drizzle.__drizzle_migrations` ficava vazio → `db:migrate` colidia ("relation already exists").
- **Resolvido:** `pnpm db:baseline` (`src/scripts/baseline-migrations.ts`) registra migrations do journal já existentes (hash sha256 idêntico ao drizzle + `created_at=journal.when`). Idempotente.
- Fluxo agora: `db:generate` → revisar `.sql` → `db:migrate` (limpo, idempotente). `db:push` ainda ok p/ dev rápido, mas migrate é a fonte rastreável.
- Se um ambiente novo acusar desync push/migrate, rodar `pnpm db:baseline` 1x antes do `db:migrate`.

## Idioma & commits

- Código/identificadores em inglês. Mensagens de API/erro e docs em **português**.
- Commits: Conventional Commits em inglês, 1 por feature, corpo proporcional. **Nunca commitar sem confirmação explícita do usuário. Sem `Co-Authored-By`.**
- `git user.name`: `dev-bernardofofg` / email `dev.bernardofofg@gmail.com` (verificar antes de commitar).
