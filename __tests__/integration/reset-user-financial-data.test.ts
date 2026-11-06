import { eq } from 'drizzle-orm';
import { db } from '@infra/db';
import {
  accounts,
  billPaymentOutflows,
  budgets,
  cardBillPayments,
  categories,
  companies,
  financialPeriods,
  goals,
  overtimeRecords,
  recurringTransactions,
  transactions,
  transfers,
  users,
} from '@infra/db/schema';
import { resetUserFinancialData } from '../../src/scripts/reset-user-financial-data';

function one<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) throw new Error('linha esperada');
  return row;
}

const OPENING_DATE = new Date('2026-01-01T00:00:00Z');
const NEXT_EXECUTION = new Date('2026-12-05T00:00:00Z');
const DATA_THROUGH = new Date('2026-10-30T00:00:00Z');

async function seedUser(label: string) {
  const email = `reset-${label}-${Date.now()}@test.com`;
  const user = one(
    await db
      .insert(users)
      .values({ name: `Reset ${label}`, email })
      .returning()
  );
  const category = one(
    await db.insert(categories).values({ userId: user.id, name: 'Reset cat' }).returning()
  );
  const checking = one(
    await db
      .insert(accounts)
      .values({
        userId: user.id,
        name: 'Corrente',
        type: 'checking',
        openingBalance: 150000,
        openingBalanceDate: OPENING_DATE,
        dataThrough: DATA_THROUGH,
        statementKey: `key-${label}-${Date.now()}`,
      })
      .returning()
  );
  const checking2 = one(
    await db
      .insert(accounts)
      .values({ userId: user.id, name: 'Poupança', type: 'checking' })
      .returning()
  );
  const card = one(
    await db
      .insert(accounts)
      .values({ userId: user.id, name: 'Cartão', type: 'credit_card', closingDay: 5, dueDay: 12 })
      .returning()
  );

  const period = one(
    await db
      .insert(financialPeriods)
      .values({
        userId: user.id,
        startDate: new Date('2026-10-01T03:00:00Z'),
        endDate: new Date('2026-11-01T02:59:59Z'),
      })
      .returning()
  );
  const globalCategory = one(
    await db
      .insert(categories)
      .values({ name: `Global ${label}`, isGlobal: true })
      .returning()
  );
  await db.insert(budgets).values([
    { userId: user.id, categoryId: category.id, monthlyLimit: 10000 },
    { userId: user.id, categoryId: globalCategory.id, monthlyLimit: 20000 },
  ]);
  await db.insert(goals).values({
    userId: user.id,
    title: 'Viagem',
    targetAmount: 500000,
    targetDate: NEXT_EXECUTION,
  });

  const [tx1, tx2] = await db
    .insert(transactions)
    .values([
      {
        userId: user.id,
        type: 'expense',
        title: 'Mercado',
        amount: 5000,
        categoryId: category.id,
        accountId: checking.id,
        periodId: period.id,
      },
      {
        userId: user.id,
        type: 'income',
        title: 'Hora extra',
        amount: 20000,
        categoryId: category.id,
        accountId: checking.id,
      },
    ])
    .returning();

  if (!tx1 || !tx2) throw new Error('transações esperadas');

  await db.insert(recurringTransactions).values({
    userId: user.id,
    type: 'expense',
    title: 'Aluguel',
    amount: 100000,
    categoryId: category.id,
    frequency: 'monthly',
    dayOfMonth: 5,
    totalInstallments: 12,
    executedInstallments: 3,
    nextExecution: NEXT_EXECUTION,
  });

  await db.insert(transfers).values({
    userId: user.id,
    fromAccountId: checking.id,
    toAccountId: checking2.id,
    amount: 1000,
    date: DATA_THROUGH,
  });
  await db.insert(cardBillPayments).values({
    userId: user.id,
    accountId: card.id,
    dueDate: DATA_THROUGH,
    source: 'manual',
  });
  await db.insert(billPaymentOutflows).values({
    userId: user.id,
    accountId: checking.id,
    amount: 150000,
    date: DATA_THROUGH,
    externalId: `outflow-${label}`,
  });

  const company = one(
    await db
      .insert(companies)
      .values({ userId: user.id, name: 'Acme', hourlyRate: 5000 })
      .returning()
  );
  const overtime = one(
    await db
      .insert(overtimeRecords)
      .values({
        userId: user.id,
        companyId: company.id,
        startTime: new Date('2026-10-01T18:00:00Z'),
        endTime: new Date('2026-10-01T22:00:00Z'),
        hoursWorked: '4.00',
        hourlyRateSnapshot: 5000,
        amount: 20000,
        month: 10,
        year: 2026,
        transactionId: tx2.id,
      })
      .returning()
  );
  await db
    .update(transactions)
    .set({ overtimeRecordId: overtime.id })
    .where(eq(transactions.id, tx2.id));

  return { user, email, category, globalCategory, checking, card, tx1, tx2, overtime };
}

async function snapshot(userId: string) {
  const [txs, trs, bills, outflows, overtime, accs, cats, cos, recurring, periods, buds, metas] =
    await Promise.all([
      db.select().from(transactions).where(eq(transactions.userId, userId)),
      db.select().from(transfers).where(eq(transfers.userId, userId)),
      db.select().from(cardBillPayments).where(eq(cardBillPayments.userId, userId)),
      db.select().from(billPaymentOutflows).where(eq(billPaymentOutflows.userId, userId)),
      db.select().from(overtimeRecords).where(eq(overtimeRecords.userId, userId)),
      db.select().from(accounts).where(eq(accounts.userId, userId)),
      db.select().from(categories).where(eq(categories.userId, userId)),
      db.select().from(companies).where(eq(companies.userId, userId)),
      db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, userId)),
      db.select().from(financialPeriods).where(eq(financialPeriods.userId, userId)),
      db.select().from(budgets).where(eq(budgets.userId, userId)),
      db.select().from(goals).where(eq(goals.userId, userId)),
    ]);
  return { txs, trs, bills, outflows, overtime, accs, cats, cos, recurring, periods, buds, metas };
}

describe('resetUserFinancialData', () => {
  let target: Awaited<ReturnType<typeof seedUser>>;
  let other: Awaited<ReturnType<typeof seedUser>>;

  beforeEach(async () => {
    target = await seedUser('target');
    other = await seedUser('other');
  });

  it('sem confirm só conta e não altera nada', async () => {
    const before = await snapshot(target.user.id);

    const counts = await resetUserFinancialData(target.email, { confirm: false });

    expect(counts).toEqual({
      transactions: 2,
      transfers: 1,
      billPayments: 1,
      billPaymentOutflows: 1,
      recurringTransactions: 1,
      categories: 1,
      budgets: 1,
      overtimeLinks: 1,
      accounts: 1,
    });
    expect(await snapshot(target.user.id)).toEqual(before);
  });

  it('com confirm limpa apenas o usuário informado', async () => {
    const otherBefore = await snapshot(other.user.id);

    const counts = await resetUserFinancialData(target.email, { confirm: true });

    expect(counts).toEqual({
      transactions: 2,
      transfers: 1,
      billPayments: 1,
      billPaymentOutflows: 1,
      recurringTransactions: 1,
      categories: 1,
      budgets: 1,
      overtimeLinks: 1,
      accounts: 1,
    });
    const after = await snapshot(target.user.id);
    expect(after.txs).toHaveLength(0);
    expect(after.trs).toHaveLength(0);
    expect(after.bills).toHaveLength(0);
    expect(after.outflows).toHaveLength(0);
    expect(after.recurring).toHaveLength(0);
    expect(after.cats).toHaveLength(0);
    expect(await snapshot(other.user.id)).toEqual(otherBefore);
  });

  it('mantém horas extras, empresas, contas, períodos, metas e categorias globais', async () => {
    await resetUserFinancialData(target.email, { confirm: true });

    const after = await snapshot(target.user.id);
    expect(after.overtime).toHaveLength(1);
    expect(after.overtime[0]?.transactionId).toBeNull();
    expect(after.accs).toHaveLength(3);
    expect(after.cos).toHaveLength(1);
    expect(after.periods).toHaveLength(1);
    expect(after.metas).toHaveLength(1);
    expect(after.buds.map((budget) => budget.categoryId)).toEqual([target.globalCategory.id]);
    expect(
      await db.select().from(categories).where(eq(categories.id, target.globalCategory.id))
    ).toHaveLength(1);
  });

  it('zera saldo inicial e data_through', async () => {
    const before = one(await db.select().from(accounts).where(eq(accounts.id, target.checking.id)));

    await resetUserFinancialData(target.email, { confirm: true });

    const after = one(await db.select().from(accounts).where(eq(accounts.id, target.checking.id)));
    expect(after.openingBalance).toBe(0);
    expect(after.openingBalanceDate).toBeNull();
    expect(after.dataThrough).toBeNull();
    expect(after.statementKey).toBe(before.statementKey);
  });

  it('recusa e-mail inexistente', async () => {
    await expect(
      resetUserFinancialData(`ninguem-${Date.now()}@test.com`, { confirm: true })
    ).rejects.toThrow(/não encontrado/);
  });
});
