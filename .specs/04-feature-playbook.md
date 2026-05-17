# 04 — Playbook: Adicionar Feature

Ordem canônica. Seguir camada por camada (bottom-up). Exemplo de referência: módulo **budget**.

## 0. Antes

- Ler `02-conventions.md`. Se mexe em dados, ler/atualizar `03-domain-model.md`.
- Decidir entidade, endpoints, regras.

## 1. Schema DB (se nova tabela/coluna)

- Editar `src/db/schema.ts`: `pgTable`, FKs `onDelete:"cascade"`, timestamps `defaultNow().notNull()`, decimais `decimal(_,{precision:10,scale:2})`.
- Adicionar `relations(...)` e exports `Entidade`/`NewEntidade`.
- `pnpm db:generate` → revisar migration em `src/db/migrations/` → `pnpm db:push` (ou `db:migrate`).

## 2. Interface do repositório

- `src/repositories/interfaces/IXRepository.ts`: métodos granulares tipados (`create`, `findByIdAndUserId`, `update`, `delete`, queries específicas).
- Reexportar em `src/repositories/interfaces/index.ts`.

## 3. Repositório

- `src/repositories/x.repository.ts`: `export const xRepository = { ... } satisfies IXRepository;` + `export type { IXRepository };`.
- Só Drizzle. `?? null`, `update` seta `updatedAt`, `delete` → boolean.

> Regras de cada camada (assinaturas, padrões obrigatórios, proibições): ver `02-conventions.md`. Aqui só **ordem** e **o que criar**.

## 4. Validações de domínio
- `src/validations/x.validation.ts`: `validateXExists(id, userId)` etc. (regra: `02 §Validação`).

## 5. Service
- `src/services/x.service.ts`: `createXService(userId, data)` etc. (regra: `02 §SOLID/Erros`).
- Cálculos derivados (progresso, %) aqui, nunca no controller.

## 6. Schema Zod
- `src/schemas/x.schema.ts`: `create*/update*/*QuerySchema`. `idParamSchema` reaproveitável de `auth.schema.ts` (regra: `02 §Validação`).

## 7. Controller
- `src/controllers/x.controller.ts`: 1 função/endpoint (regra: `02 §Resposta/Erros/Auth`).

## 8. Router
- `src/routes/x.router.ts` + registrar em `src/routes.ts` `router.use("/x", XRouter)` (regra: `02 §Auth`).

## 9. Testes

- Unit service: `__tests__/unit/services/x.service.test.ts` (mock repositório).
- Integração: `__tests__/integration/x.test.ts` (supertest contra app + test DB).
- E2E (fluxo completo): `__tests__/e2e/*.spec.ts` (Playwright) se for fluxo de usuário relevante.
- Rodar `pnpm test:unit` / `pnpm test:integration`.

## 10. Docs & geração front

- Atualizar `openapi.json` se o front consome (Swagger em `/api-docs`).
- `pnpm api:generate` regenera tipos/Zod/hooks p/ frontend.
- Atualizar `.specs/05-feature-catalog.md` e `03-domain-model.md`.
- `client/requests/x.http` opcional para testes manuais.

## Checklist final

- [ ] Sem regra de negócio em controller
- [ ] `ResponseHandler` em toda resposta
- [ ] `HttpError` + `isHttpError → next` para erros de domínio
- [ ] Zod via middleware `validate`
- [ ] Repositório `satisfies IXRepository`
- [ ] `requireUser` no início do service
- [ ] Datas no timezone São Paulo
- [ ] Testes unit + integração passando
- [ ] Specs atualizadas
- [ ] Commit só após confirmação do usuário
