# 🧪 Testes Automatizados

## 🎯 Início Rápido

**Primeira vez aqui?** Veja o [Guia Rápido](./QUICK_TEST_GUIDE.md)!

```bash
# 1. Configurar banco de teste (primeira vez)
pnpm test:db:setup
pnpm test:db:push

# 2. Rodar testes
pnpm test:unit              # Unitários (rápido, sem banco)
pnpm test:integration       # Integração (com banco de teste)
pnpm test:coverage          # Com relatório de cobertura
```

**✅ Testes usam banco de teste isolado no Neon (não afeta desenvolvimento!)**

---

## 📁 Estrutura

```
__tests__/
├── setup/              # Configurações e helpers de teste
│   └── test-helpers.ts
├── unit/              # Testes unitários
│   ├── helpers/
│   ├── services/
│   └── repositories/
└── integration/       # Testes de integração
    ├── auth.test.ts
    └── ...
```

## 🚀 Comandos

```bash
# Rodar todos os testes
pnpm test

# Rodar testes em modo watch
pnpm test:watch

# Gerar relatório de cobertura
pnpm test:coverage

# Rodar apenas testes unitários
pnpm test:unit

# Rodar apenas testes de integração
pnpm test:integration
```

## 📝 Convenções

### Nomenclatura de Arquivos

- `*.test.ts` - Testes unitários
- `*.spec.ts` - Testes de integração
- `*.mock.ts` - Mocks reutilizáveis

### Estrutura de Testes

```typescript
describe("NomeDaFuncionalidade", () => {
  beforeEach(() => {
    // Setup antes de cada teste
  });

  afterEach(() => {
    // Cleanup após cada teste
  });

  describe("métodoEspecífico", () => {
    it("deve fazer X quando Y", () => {
      // Arrange (preparar)
      // Act (executar)
      // Assert (verificar)
    });

    it("deve lançar erro quando Z", () => {
      // Teste de erro
    });
  });
});
```

## 🎯 Tipos de Testes

### Testes Unitários

Testam funções e métodos isolados, com mocks de dependências.

**Exemplo:**

```typescript
// __tests__/unit/services/user.service.test.ts
import { createUserService } from "../../../src/services/user.service";
import { UserRepository } from "../../../src/repositories/user.repository";

jest.mock("../../../src/repositories/user.repository");

describe("UserService", () => {
  it("deve criar usuário", async () => {
    (UserRepository.create as jest.Mock).mockResolvedValue(mockUser);
    const result = await createUserService(userData);
    expect(result).toBeDefined();
  });
});
```

### Testes de Integração

Testam fluxos completos, incluindo rotas e banco de dados.

**Exemplo:**

```typescript
// __tests__/integration/auth.test.ts
import request from "supertest";
import { app } from "../../src/server";

describe("Auth", () => {
  it("POST /auth/sign-up deve criar usuário", async () => {
    const response = await request(app)
      .post("/auth/sign-up")
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

## 🔧 Configuração

### Banco de Dados de Teste

Configure uma variável de ambiente separada:

```env
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/moneyly_test
```

### Mocks Globais

Mocks comuns estão em `__tests__/setup/test-helpers.ts`.

## 📊 Cobertura

Meta de cobertura:

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## 🐛 Debugging

Para debugar um teste específico:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand specific.test.ts
```

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
