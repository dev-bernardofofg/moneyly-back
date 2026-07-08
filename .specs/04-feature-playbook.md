# 04 — Playbook: Adicionar Feature

Ordem canônica. Seguir camada por camada (bottom-up). Exemplo de referência: módulo **transaction** (factory DI) — budget/goal seguem o mesmo template.

## 0. Antes

- Ler `02-conventions.md`. Se mexe em dados, ler/atualizar `03-domain-model.md`.
- Decidir entidade, endpoints, regras.

## 1. Schema DB (se nova tabela/coluna)

- Editar `src/db/schema.ts`: `pgTable`, FKs `onDelete:"cascade"`, timestamps `defaultNow().notNull()`, decimais `decimal(_,{precision:10,scale:2})`.
- Adicionar `relations(...)` e exports `Entidade`/`NewEntidade`.
- `pnpm db:generate` → revisar migration em `src/db/migrations/` → `pnpm db:push` (ou `db:migrate`).

## 2. Interface do repositório

- `src/repositories/interfaces/IXRepository.ts`: métodos granulares tipados (`create`, `findByIdAndUserId`, `update`, `delete`, queries específicas). Fonte única — nunca definir interface inline no barrel.
- Adicionar `export * from './IXRepository'` em `src/repositories/interfaces/index.ts` (barrel puro).

## 3. Repositório

- `src/repositories/x.repository.ts`: `export const xRepository = { ... } satisfies IXRepository;` + `export type { IXRepository };`.
- Só Drizzle. `?? null`, `update` seta `updatedAt`, `delete` → boolean.

> Regras de cada camada (assinaturas, padrões obrigatórios, proibições): ver `02-conventions.md`. Aqui só **ordem** e **o que criar**.

## 4. Validações de domínio

- `src/validations/x.validation.ts`: `validateXExists(id, userId)` etc. (regra: `02 §Validação`).

## 5. Service

- `src/services/x.service.ts`: `XServiceDeps` + `makeXService(deps)` retornando os métodos (`create`, `update`, `delete: remove`...) + composition root `export const xService = makeXService({...singletons})` (regra: `02 §Service/Erros`).
- Deps tipadas por interface (`Pick<IXRepository, ...>`); erros via classes semânticas de `services/errors`.
- Cálculos derivados (progresso, %) aqui, nunca no controller; puras sem deps ficam fora da factory.

## 6. Schema Zod

- `src/schemas/x.schema.ts`: `create*/update*/*QuerySchema`. `idParamSchema` reaproveitável de `auth.schema.ts` (regra: `02 §Validação`).

## 7. Controller

- `src/controllers/x.controller.ts`: 1 função/endpoint, consumindo a instância `xService.metodo(...)` (regra: `02 §Resposta/Erros/Auth`). Nunca acessar repositório direto.

## 8. Router

- `src/routes/x.router.ts` + registrar em `src/routes.ts` `router.use("/x", XRouter)` (regra: `02 §Auth`).

## 9. Testes

- Unit service: `__tests__/unit/services/x.service.test.ts` — `makeXService({...fakes com jest.fn()})`; sem `jest.mock` de módulo. Títulos describe/it em inglês. Roda 100% em memória (projeto jest `unit`, sem DB).
- Integração: `__tests__/integration/x.test.ts` (supertest contra app + test DB; projeto jest `integration`).
- E2E (fluxo completo): `__tests__/e2e/*.spec.ts` (Playwright) se for fluxo de usuário relevante.
- Rodar `pnpm test:unit` / `pnpm test:integration` (scripts usam `--selectProjects`).

## 10. Docs & geração front

- Atualizar `openapi.json` se o front consome (Swagger em `/api-docs`).
- `pnpm api:generate` regenera tipos/Zod/hooks p/ frontend.
- Atualizar `.specs/05-feature-catalog.md` e `03-domain-model.md`.
- `client/requests/x.http` opcional para testes manuais.

## Checklist final

- [ ] Sem regra de negócio em controller (nem acesso a repositório)
- [ ] `ResponseHandler` em toda resposta
- [ ] Erros semânticos de `services/errors` + `isHttpError → next`
- [ ] Zod via middleware `validate`
- [ ] Repositório `satisfies IXRepository`; interface só no arquivo próprio (barrel re-exporta)
- [ ] Service = `makeXService(deps)` + composition root; controller usa a instância
- [ ] Teste unit injeta fakes na factory (sem `jest.mock` de módulo)
- [ ] `requireUser` no início do service
- [ ] Datas no timezone São Paulo
- [ ] Testes unit + integração passando
- [ ] Specs atualizadas
- [ ] Commit só após confirmação do usuário
