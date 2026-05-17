# I1 — Gerador de `openapi.json` (zod-to-openapi)

**Tipo:** infra / bloqueante. **Status:** spec (não implementado).
**Por quê:** `openapi.json` hoje é mão-de-obra manual e está podre — endpoints reais (`/transactions/export`, `/overview/insights`, `/transactions/summary-by-month`) faltam. Front gera hooks errados em cima dele. Sem gerador real, o contrato front↔back (`moneyly/.specs/`) é fantasia.

## Objetivo

`openapi.json` derivado do código, fonte = schemas Zod já existentes em `src/schemas/`. Comando idempotente. CI falha se divergir.

## Biblioteca

`@asteasolutions/zod-to-openapi` (devDependency). Compatível com zod 3.x (back usa `^3.24.3`).
- `extendZodWithOpenApi(z)` 1x no bootstrap → habilita `.openapi()` opcional nos schemas.
- `OpenAPIRegistry` p/ registrar schemas + rotas.
- `OpenApiGeneratorV3` → documento OpenAPI 3.0 → `JSON.stringify` → `openapi.json` na raiz do back.

Descartado: `swagger-jsdoc` (anotação manual JSDoc = mesmo apodrecimento que temos hoje).

## Decisões

1. **Rotas são Express manuais (sem decorators)** → precisa de um **registry central** que enumera cada endpoint (método, path, auth, request, response) reaproveitando os schemas Zod de `src/schemas/`. Não há autodiscovery; é explícito por design (1 lugar só, revisável).
2. **Envelope de resposta** (`{ data }` / `{ success:false,error }` / paginado) NÃO está nos schemas Zod (eles validam só request). Criar helpers `wrapSuccess(schema)`, `wrapPaginated(schema)`, `errorResponse` que envelopam qualquer schema no shape do `ResponseHandler` (ver `02-conventions.md §Resposta`).
3. **Auth**: registrar `bearerAuth` (http bearer JWT) como security scheme; aplicar nas rotas sob `authenticateUser`.
4. **Convenções do domínio refletidas no doc**: dinheiro = `string` (decimal), datas = `string` ISO, ids = `string uuid`. Param `:id` inválido → resposta 404 documentada (ver `02-conventions.md`).
5. `openapi.json` versionado continua commitado (front consome via path — ver `moneyly/.specs/04-sync-protocol.md`), mas marcado como **gerado** (header `info.description` + comentário no PR template).

## Arquitetura proposta

```
src/openapi/
├── registry.ts        # OpenAPIRegistry + extendZodWithOpenApi + bearerAuth
├── envelopes.ts        # wrapSuccess / wrapPaginated / errorResponse
├── paths/              # 1 arquivo por módulo, registra endpoints
│   ├── auth.paths.ts
│   ├── transactions.paths.ts   # inclui /export, /summary-by-month
│   ├── overview.paths.ts        # inclui /insights
│   ├── budgets.paths.ts
│   └── ... (categories, goals, user, recurring)
└── generate.ts         # monta doc, escreve ../openapi.json
```

- `paths/*.paths.ts` importam os schemas existentes de `src/schemas/*.schema.ts` (zero duplicação de validação).
- Schemas que ainda não existem p/ endpoints sem body (ex: `/transactions/export` query, `/overview/insights` response) → criar o Zod schema correspondente em `src/schemas/` (também passa a validar de verdade via middleware = ganho colateral).

## Passos de implementação

1. `pnpm add -D @asteasolutions/zod-to-openapi`.
2. `src/openapi/registry.ts`: `extendZodWithOpenApi(z)`, exportar `registry`, registrar `bearerAuth`.
3. `src/openapi/envelopes.ts`: helpers de envelope (success/paginated/error) conforme `ResponseHandler`.
4. Para cada router em `src/routes/*.router.ts`: criar `paths/<mod>.paths.ts` espelhando método+path+middlewares (auth?), `request` (body/params/query = schema Zod existente), `responses` (envelopado). **Auditar router vs paths** — todo endpoint do router tem de estar registrado.
5. Criar schemas Zod faltantes (query do export, response de insights/summary-by-month, etc.) em `src/schemas/`.
6. `src/openapi/generate.ts`: `new OpenApiGeneratorV3(registry.definitions).generateDocument({...info, servers, security})` → `writeFileSync(openapi.json)`.
7. `package.json` scripts:
   - `"openapi:gen": "tsx src/openapi/generate.ts"`
   - `"api:generate": "pnpm openapi:gen && kubb generate && orval && node scripts/fix-axios-imports.js"` (gen antes de consumir)
8. Rodar `pnpm openapi:gen`, conferir diff (deve ADICIONAR export/insights/summary-by-month), `pnpm api:generate`.
9. Guard CI: step que roda `pnpm openapi:gen` + `git diff --exit-code openapi.json` (falha se desatualizado).
10. `src/routes.ts` já lê `openapi.json` p/ Swagger UI — passa a refletir realidade automático.

## Edge cases a cobrir

- Endpoints sem body (GET) — só params/query/response.
- `/transactions/export` retorna **CSV (blob), não JSON** → documentar `content: text/csv`, não envelope.
- Paginação (`/transactions`, `/recurring-transactions`) → `wrapPaginated`.
- 401 (sem token) em toda rota autenticada; 404 p/ `:id` UUID inválido; 409 (orçamento duplicado).
- Decimais como `string` no schema de saída (não `number`).

## Testes

- Teste que importa `generate.ts`, gera doc em memória, asserta: contém paths `/transactions/export`, `/overview/insights`, `/transactions/summary-by-month`; todo path tem `security` se rota autenticada; envelope presente nas respostas 2xx.
- Teste de regressão "router ↔ openapi": varre os `*.router.ts` e garante que cada `(method, path)` existe no doc gerado (pega endpoint novo esquecido).

## Riscos

- Esforço inicial: registrar ~8 módulos de rotas à mão. Mitiga drift futuro pelo teste router↔openapi.
- `@asteasolutions/zod-to-openapi` casa com zod v3; se subir zod p/ v4 reavaliar (front usa `^3.25` — ok).
- Versão Kubb back (4.1) ≠ front (4.33). Alinhar ao mexer (ver `moneyly/.specs/01-api-contract.md`).

## Definition of Done

- [ ] `pnpm openapi:gen` gera `openapi.json` cobrindo 100% dos endpoints dos routers
- [ ] R2/R4/R5 aparecem no `openapi.json`
- [ ] `api:generate` roda `openapi:gen` antes
- [ ] Teste router↔openapi verde
- [ ] Guard CI configurado
- [ ] `openapi.json` nunca mais editado à mão (regra em `moneyly/.specs/04-sync-protocol.md`)
- [ ] Front regenera hooks e R2/R4 destravados em `moneyly/.specs/03-feature-roadmap.md`
