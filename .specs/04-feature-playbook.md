# 04 — Playbook: Adicionar Feature

Ordem canônica, camada por camada (bottom-up). **Feature nova nasce na estrutura modular**
(`src/modules/<x>/` — ver `06-project-structure.md`); só toque nas pastas legadas
(`src/controllers`, `src/services`...) para alterar módulo ainda não migrado.

## 0. Antes

- Ler `02-conventions.md`. Se mexe em dados, ler/atualizar `03-domain-model.md`.
- Decidir: módulo novo ou extensão de existente? Entidade, endpoints, regras.
- Criar esqueleto: `src/modules/<x>/{schemas,use-cases,repositories,validations}/`.

## 1. Schema DB (se nova tabela/coluna)

- Editar `src/infra/db/schema.ts` (legado: `src/db/schema.ts`): `pgTable`, FKs `onDelete:"cascade"`, timestamps `defaultNow().notNull()`, decimais `decimal(_,{precision:10,scale:2})`.
- Adicionar `relations(...)` e exports `Entidade`/`NewEntidade`.
- `pnpm db:generate` → revisar migration → `pnpm db:migrate` (ou `db:push` em dev).

## 2. Repositório (interface + implementação)

- `modules/<x>/repositories/interfaces.ts`: `I<X>Repository` com métodos granulares tipados.
- `modules/<x>/repositories/<x>.repository.ts`: `export const xRepository = { ... } satisfies IXRepository;`.
- Só Drizzle. `?? null`, `update` seta `updatedAt`, `delete` → boolean.

> Regras de cada camada (assinaturas, padrões obrigatórios, proibições): `02-conventions.md`. Aqui só **ordem** e **o que criar**.

## 3. Validações de domínio

- `modules/<x>/validations/`: `validateXExists(id, userId)` etc. — lançam `HttpError`.

## 4. Use-cases

- `modules/<x>/use-cases/<verbo>-<recurso>.use-case.ts` — **1 operação de negócio por arquivo**, exporta 1 função async.
- Cálculos derivados (progresso, %) aqui, nunca no controller.
- Lógica pura/testável sem DB → `modules/<x>/helpers/`. Utilitário stateless entre ≥2 use-cases → `modules/<x>/services/` (nunca chama use-case).
- Precisa de outro módulo? Importar do `index.ts` público dele, nunca de internals.
- Job de scheduler = use-case (`process-*.use-case.ts`), exportado no `index.ts` e ligado em `src/server.ts`.

## 5. Schema Zod (request)

- `modules/<x>/schemas/`: `create*/update*/*QuerySchema`. `idParamSchema` reaproveitável (core). Mensagens em português.

## 6. Controller

- `modules/<x>/<x>.controller.ts`: 1 função/endpoint, `asyncHandler`, chama 1 use-case, `ResponseHandler`.

## 7. Router

- `modules/<x>/<x>.router.ts`: `authenticateUser` no topo, `validate({...})` por rota. Registrar em `src/routes.ts`.

## 8. OpenAPI

- `modules/<x>/<x>.paths.ts`: registrar cada endpoint (reusa os schemas Zod do módulo). Importar no agregador (`core/openapi/generate`). `pnpm openapi:gen`.

## 9. Testes

- Unit: `__tests__/unit/modules/<x>/use-cases/*.test.ts` (mock repositório) e `__tests__/unit/modules/<x>/helpers/*.test.ts` (puro, sem mock).
- Integração: `__tests__/integration/<x>.test.ts` (supertest + test DB).
- E2E (Playwright) se for fluxo de usuário relevante.
- `pnpm test:unit` / `pnpm test:integration`.

## 10. Docs & geração front

- `pnpm api:generate` regenera tipos/Zod/hooks p/ frontend.
- Atualizar `.specs/05-feature-catalog.md` e `03-domain-model.md`; spec da feature em `.specs/features/`.
- `client/requests/x.http` opcional para testes manuais.

## Checklist final

- [ ] Feature inteira dentro de `src/modules/<x>/` (nada novo nas pastas legadas)
- [ ] 1 use-case = 1 operação; sem regra de negócio em controller
- [ ] `ResponseHandler` em toda resposta
- [ ] `HttpError` + `isHttpError → next` para erros de domínio
- [ ] Zod via middleware `validate`
- [ ] Repositório `satisfies IXRepository` (interface no módulo)
- [ ] Datas no timezone São Paulo
- [ ] `<x>.paths.ts` registrado + `pnpm openapi:gen` rodado
- [ ] Testes unit + integração passando
- [ ] Specs atualizadas
- [ ] Commit só após confirmação do usuário
