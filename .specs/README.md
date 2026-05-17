# 📐 Specs — Moneyly Backend

Documentação spec-driven para recuperação de contexto, padrões e features.
Mantida manualmente. Atualizar sempre que padrão ou domínio mudar.

## Índice

| Arquivo | Conteúdo |
|---|---|
| [01-architecture.md](01-architecture.md) | Camadas, fluxo de request, stack, infraestrutura |
| [02-conventions.md](02-conventions.md) | Padrões de código obrigatórios (SOLID, ResponseHandler, erros, Zod) |
| [03-domain-model.md](03-domain-model.md) | Modelo de dados, tabelas, relacionamentos, regras de negócio |
| [04-feature-playbook.md](04-feature-playbook.md) | Passo a passo para adicionar nova feature |
| [05-feature-catalog.md](05-feature-catalog.md) | Catálogo de features existentes e endpoints |

## Specs compartilhados (Front ↔ Back)

Contrato entre `moneyly-back` e `moneyly-front` fica em `../../.specs/` (raiz `moneyly/`).
Mudou endpoint/payload/invariante de domínio → atualizar `../../.specs/01-api-contract.md` / `02-shared-domain.md` e regenerar `openapi.json`.

## Como usar (para o assistente)

1. Antes de implementar feature nova: ler `02-conventions.md` + `04-feature-playbook.md`.
2. Mexer em dados/regra: ler `03-domain-model.md`.
3. Entender feature existente: `05-feature-catalog.md`.
4. Dúvida arquitetural: `01-architecture.md`.

## Regra de manutenção

Mudou padrão de código → atualizar `02`.
Mudou `src/db/schema.ts` → atualizar `03`.
Nova feature → atualizar `05` e seguir `04`.
