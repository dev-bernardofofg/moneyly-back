# F7 — Registro de Horas Extras (Overtime)

## Objetivo

Usuário registra horas extras trabalhadas por empresa. Cada registro gera automaticamente
uma transação de receita vinculada. Editar ou deletar o registro sincroniza a transação.

---

## Entidades

### `companies`

| Campo      | Tipo          | Notas                       |
| ---------- | ------------- | --------------------------- |
| id         | uuid PK       |                             |
| userId     | uuid FK       | cascade delete              |
| name       | varchar(100)  | não nulo                    |
| hourlyRate | decimal(10,2) | R$/hora; não nulo, positivo |
| isActive   | boolean       | default true; soft-delete   |
| createdAt  | timestamp     | defaultNow                  |
| updatedAt  | timestamp     | defaultNow                  |

Regra: mudança de `hourlyRate` é persistida na empresa, mas **não recalcula registros
existentes** — taxa é congelada no `overtime_records.hourlyRateSnapshot`.

### `overtime_records`

| Campo              | Tipo          | Notas                                               |
| ------------------ | ------------- | --------------------------------------------------- |
| id                 | uuid PK       |                                                     |
| userId             | uuid FK       | cascade delete                                      |
| companyId          | uuid FK       | cascade delete                                      |
| description        | varchar(500)  | opcional                                            |
| startTime          | timestamp     | não nulo                                            |
| endTime            | timestamp     | não nulo; deve ser > startTime                      |
| hoursWorked        | decimal(10,2) | calculado: (endTime - startTime) / 3600; armazenado |
| hourlyRateSnapshot | decimal(10,2) | congelado no momento do cadastro                    |
| amount             | decimal(10,2) | hoursWorked × hourlyRateSnapshot; armazenado        |
| month              | integer       | mês civil (1–12) derivado de startTime              |
| year               | integer       | ano derivado de startTime                           |
| transactionId      | uuid FK       | nullable → transactions.id; criado junto            |
| createdAt          | timestamp     | defaultNow                                          |
| updatedAt          | timestamp     | defaultNow                                          |

> **Decisão:** overtime usa mês civil (1 ao último dia do mês), **não** o período financeiro
> do usuário. A transaction vinculada ainda recebe o `periodId` financeiro normalmente.

`overtimeRecordId uuid FK nullable` em `transactions` (mesmo padrão de `recurringTransactionId`).

---

## Cálculos

```
hoursWorked = (endTime - startTime) / 3600          // horas decimais, ex: 1.5h
amount      = hoursWorked × hourlyRateSnapshot       // R$
month       = startTime.getMonth() + 1              // 1-12
year        = startTime.getFullYear()
```

Armazenar todos no DB — não calcular on-the-fly.

---

## Endpoints

### Companies

| Método | Path           | Descrição                         |
| ------ | -------------- | --------------------------------- |
| POST   | /companies/    | Criar empresa                     |
| GET    | /companies/    | Listar empresas ativas do usuário |
| PUT    | /companies/:id | Atualizar (nome e/ou taxa)        |
| DELETE | /companies/:id | Soft-delete (isActive = false)    |

### Overtime

| Método | Path              | Descrição                                      |
| ------ | ----------------- | ---------------------------------------------- |
| POST   | /overtime/        | Criar registro → cria income transaction       |
| GET    | /overtime/        | Listar (filtros: `month`, `year`, `companyId`) |
| GET    | /overtime/summary | Resumo do mês: total horas + valor             |
| PUT    | /overtime/:id     | Editar → recalcula → atualiza transaction      |
| DELETE | /overtime/:id     | Deletar → deleta transaction vinculada         |

---

## Fluxo de criação

1. Recebe `companyId`, `categoryId?`, `description?`, `startTime`, `endTime`
2. Valida: `endTime > startTime`, `startTime` não no futuro, empresa pertence ao usuário e está ativa
3. Calcula `hoursWorked`, `hourlyRateSnapshot`, `amount`, `month`, `year`
4. Detecta `periodId` financeiro pela `startTime` (apenas para a transaction)
5. Resolve categoria: usa `categoryId` fornecido ou fallback global "Salário"
6. Cria `overtime_record`
7. Cria `transaction` income:
   - `type: income`
   - `title: "Hora extra — {company.name}"`
   - `amount: overtime.amount`
   - `date: startTime`
   - `periodId`: período financeiro detectado
   - `overtimeRecordId: overtime.id`
8. Atualiza `overtime_record.transactionId`

## Fluxo de edição

1. Recebe campos parciais (`companyId?`, `categoryId?`, `description?`, `startTime?`, `endTime?`)
2. Se mudou `companyId`, `startTime` ou `endTime`:
   - Recalcula `hoursWorked`, `hourlyRateSnapshot`, `amount`, `month`, `year`
   - Detecta novo `periodId` financeiro (para a transaction)
3. Atualiza `overtime_record`
4. Atualiza `transaction` vinculada: `amount`, `date`, `periodId`, `title` (se empresa mudou)

## Fluxo de deleção

1. Deleta `transaction` vinculada (se existir)
2. Deleta `overtime_record`

---

## Summary endpoint — `GET /overtime/summary?month=&year=`

```json
{
  "month": 5,
  "year": 2026,
  "totalHours": 12.5,
  "totalAmount": 1875.0,
  "byCompany": [
    { "companyId": "...", "companyName": "Acme", "hours": 8.0, "amount": 1200.0 },
    { "companyId": "...", "companyName": "Beta", "hours": 4.5, "amount": 675.0 }
  ]
}
```

---

## Validações de domínio

- `endTime > startTime` — erro 400
- `startTime` não pode ser no futuro — erro 400
- `companyId` deve pertencer ao usuário e estar ativa — erro 404
- Registro de outro usuário — erro 404

---

## Camadas implementadas

```
src/db/schema.ts
src/repositories/company.repository.ts
src/repositories/overtime.repository.ts
src/repositories/interfaces/ICompanyRepository.ts
src/repositories/interfaces/IOvertimeRepository.ts
src/services/company.service.ts
src/services/overtime.service.ts
src/validations/company.validation.ts
src/validations/overtime.validation.ts
src/schemas/company.schema.ts
src/schemas/overtime.schema.ts
src/controllers/company.controller.ts
src/controllers/overtime.controller.ts
src/routes/company.router.ts
src/routes/overtime.router.ts
src/openapi/paths.ts
```

---

## Decisões registradas

- Overtime usa **mês civil** (`month`/`year`), não período financeiro — horas extras são pagas por mês de competência
- Transaction derivada usa `periodId` financeiro normal (para aparecer nos relatórios do período correto)
- Taxa congelada no registro (`hourlyRateSnapshot`) → imutabilidade retroativa
- Transaction é **derivada** — não editável diretamente (marcada por `overtimeRecordId`)
- `hoursWorked` e `amount` armazenados no DB — consistência mesmo se fórmula mudar
- Soft-delete em `companies` — preserva histórico de overtime vinculado
- `categoryId` opcional no create/update: usa fornecido ou fallback global "Salário"
