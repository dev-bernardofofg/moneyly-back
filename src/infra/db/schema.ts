import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Tabela de usuários
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password'), // Tornando opcional para suportar OAuth
  googleId: text('google_id').unique(), // ID único do Google
  avatar: text('avatar'), // URL do avatar do Google
  monthlyIncome: integer('monthly_income').default(0),
  financialDayStart: integer('financial_day_start').default(1), // Dia do mês que inicia o período financeiro
  financialDayEnd: integer('financial_day_end').default(31), // Dia do mês que termina o período financeiro
  firstAccess: boolean('first_access').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de transações
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    title: text('title').notNull(),
    amount: integer('amount').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    // ← NOVO CAMPO
    periodId: uuid('period_id').references(() => financialPeriods.id, {
      onDelete: 'cascade',
    }),
    recurringTransactionId: uuid('recurring_transaction_id'),
    overtimeRecordId: uuid('overtime_record_id'),
    // De onde o dinheiro saiu (conta corrente ou cartão). Ver specs/features/12-accounts-and-cards.md.
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    // Identificador do extrato importado (banco:conta:FITID); nulo em lançamento manual.
    externalId: text('external_id'),
    description: text('description'),
    date: timestamp('date').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('transactions_user_external_id_unique').on(table.userId, table.externalId),
    index('transactions_account_id_idx').on(table.accountId),
  ]
);

// Contas e cartões (F12). closingDay/dueDay só existem em credit_card.
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: ['checking', 'credit_card'] }).notNull(),
    closingDay: integer('closing_day'),
    dueDay: integer('due_day'),
    creditLimit: integer('credit_limit'), // Centavos; só cartão. Null = não informado.
    // Centavos. Saldo da conta corrente na data informada; transações anteriores já estão nele.
    openingBalance: integer('opening_balance').default(0).notNull(),
    openingBalanceDate: timestamp('opening_balance_date'),
    isDefault: boolean('is_default').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('accounts_user_default_unique')
      .on(table.userId)
      .where(sql`${table.isDefault}`),
  ]
);

// Dinheiro movido entre contas correntes do usuário: não é receita nem despesa.
// external_id de cada ponta impede reimportar a linha do extrato como transação.
export const transfers = pgTable(
  'transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fromAccountId: uuid('from_account_id')
      .notNull()
      .references(() => accounts.id),
    toAccountId: uuid('to_account_id')
      .notNull()
      .references(() => accounts.id),
    amount: integer('amount').notNull(), // centavos
    date: timestamp('date').notNull(),
    description: text('description'),
    fromExternalId: text('from_external_id'),
    toExternalId: text('to_external_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('transfers_user_date_idx').on(table.userId, table.date),
    uniqueIndex('transfers_user_from_external_unique').on(table.userId, table.fromExternalId),
    uniqueIndex('transfers_user_to_external_unique').on(table.userId, table.toExternalId),
  ]
);

// Fatura paga: uma linha por cartão e vencimento. Ausente = pendente.
export const cardBillPayments = pgTable(
  'card_bill_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    dueDate: timestamp('due_date').notNull(),
    source: text('source', { enum: ['manual', 'import'] }).notNull(),
    paidAt: timestamp('paid_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('card_bill_payments_account_due_unique').on(table.accountId, table.dueDate),
  ]
);

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Tornando opcional para categorias globais
  name: text('name').notNull(),
  isGlobal: boolean('is_global').default(false).notNull(), // Nova coluna para categorias globais
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Nova tabela para controlar preferências de categorias globais por usuário
export const userCategoryPreferences = pgTable('user_category_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  isVisible: boolean('is_visible').default(true).notNull(), // Se a categoria global deve ser visível para o usuário
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de orçamentos por categoria
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  monthlyLimit: integer('monthly_limit').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de objetivos de poupança
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  targetAmount: integer('target_amount').notNull(),
  currentAmount: integer('current_amount').default(0),
  targetDate: timestamp('target_date').notNull(),
  startDate: timestamp('start_date').defaultNow().notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de marcos de progresso dos objetivos
export const goalMilestones = pgTable('goal_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  percentage: integer('percentage').notNull(), // 25, 50, 75, 100
  amount: integer('amount').notNull(),
  isReached: boolean('is_reached').default(false),
  reachedAt: timestamp('reached_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabela de períodos financeiros
export const financialPeriods = pgTable(
  'financial_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userStartEndUnique: unique('financial_periods_user_start_end_unique').on(
      table.userId,
      table.startDate,
      table.endDate
    ),
  })
);

// Relacionamentos
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  categories: many(categories),
  budgets: many(budgets),
  goals: many(goals),
  categoryPreferences: many(userCategoryPreferences),
  financialPeriods: many(financialPeriods),
  refreshTokens: many(refreshTokens),
  recurringTransactions: many(recurringTransactions),
  companies: many(companies),
  overtimeRecords: many(overtimeRecords),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  period: one(financialPeriods, {
    fields: [transactions.periodId],
    references: [financialPeriods.id],
  }),
  recurringTransaction: one(recurringTransactions, {
    fields: [transactions.recurringTransactionId],
    references: [recurringTransactions.id],
  }),
  overtimeRecord: one(overtimeRecords, {
    fields: [transactions.overtimeRecordId],
    references: [overtimeRecords.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
  userPreferences: many(userCategoryPreferences),
}));

export const categoryBudgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  milestones: many(goalMilestones),
}));

export const goalMilestonesRelations = relations(goalMilestones, ({ one }) => ({
  goal: one(goals, {
    fields: [goalMilestones.goalId],
    references: [goals.id],
  }),
}));

export const userCategoryPreferencesRelations = relations(userCategoryPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userCategoryPreferences.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [userCategoryPreferences.categoryId],
    references: [categories.id],
  }),
}));

export const financialPeriodsRelations = relations(financialPeriods, ({ one, many }) => ({
  user: one(users, {
    fields: [financialPeriods.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

// Tabela de refresh tokens
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // Token hasheado
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabela de transações recorrentes
export const recurringTransactions = pgTable('recurring_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  title: text('title').notNull(),
  amount: integer('amount').notNull(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  frequency: text('frequency', {
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  }).notNull(),
  // Null = conta padrão do usuário. Cartão: cada cobrança cai no período da fatura.
  accountId: uuid('account_id').references(() => accounts.id),
  dayOfMonth: integer('day_of_month'), // Para frequência monthly (1-31)
  dayOfWeek: integer('day_of_week'), // Para frequência weekly (0-6, domingo = 0)
  startDate: timestamp('start_date'),
  totalInstallments: integer('total_installments'),
  executedInstallments: integer('executed_installments').default(0).notNull(),
  nextExecution: timestamp('next_execution').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relacionamentos para refresh tokens
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// Relacionamentos para transações recorrentes
export const recurringTransactionsRelations = relations(recurringTransactions, ({ one, many }) => ({
  user: one(users, {
    fields: [recurringTransactions.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  category: one(categories, {
    fields: [recurringTransactions.categoryId],
    references: [categories.id],
  }),
}));

// Tabela de empresas (F7 — horas extras)
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  hourlyRate: integer('hourly_rate').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de registros de horas extras (F7)
export const overtimeRecords = pgTable('overtime_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  hoursWorked: decimal('hours_worked', { precision: 10, scale: 2 }).notNull(),
  hourlyRateSnapshot: integer('hourly_rate_snapshot').notNull(),
  amount: integer('amount').notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  transactionId: uuid('transaction_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de notificações (F2 — alertas de orçamento, extensível)
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: [
      'budget_alert',
      'bill_reminder',
      'goal_milestone',
      'spending_alert',
      'transaction_income',
      'transaction_expense',
    ],
  }).notNull(),
  severity: text('severity', { enum: ['info', 'warning', 'danger'] }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  relatedId: uuid('related_id'), // ex: budgetId (nullable p/ outros tipos futuros)
  periodId: uuid('period_id').references(() => financialPeriods.id, {
    onDelete: 'cascade',
  }),
  dedupeKey: text('dedupe_key').notNull().unique(), // idempotência
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Dispositivos registrados para push (FCM). Guardamos o Firebase Installation
// ID (FID) — o registration token está deprecado nos SDKs web e admin.
export const deviceRegistrations = pgTable(
  'device_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Unique: o mesmo browser tem sempre o mesmo FID. Se outro usuário logar
    // nele, o upsert transfere o registro em vez de duplicar.
    fid: text('fid').notNull().unique(),
    userAgent: text('user_agent'),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('device_registrations_user_id_idx').on(table.userId)]
);

export const deviceRegistrationsRelations = relations(deviceRegistrations, ({ one }) => ({
  user: one(users, {
    fields: [deviceRegistrations.userId],
    references: [users.id],
  }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(users, {
    fields: [companies.userId],
    references: [users.id],
  }),
  overtimeRecords: many(overtimeRecords),
}));

export const overtimeRecordsRelations = relations(overtimeRecords, ({ one }) => ({
  user: one(users, {
    fields: [overtimeRecords.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [overtimeRecords.companyId],
    references: [companies.id],
  }),
}));

// Tipos TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryBudget = typeof budgets.$inferSelect;
export type NewCategoryBudget = typeof budgets.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalMilestone = typeof goalMilestones.$inferSelect;
export type NewGoalMilestone = typeof goalMilestones.$inferInsert;
export type UserCategoryPreference = typeof userCategoryPreferences.$inferSelect;
export type NewUserCategoryPreference = typeof userCategoryPreferences.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;
export type FinancialPeriod = typeof financialPeriods.$inferSelect;
export type NewFinancialPeriod = typeof financialPeriods.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type DeviceRegistration = typeof deviceRegistrations.$inferSelect;
export type NewDeviceRegistration = typeof deviceRegistrations.$inferInsert;
export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;
export type CardBillPayment = typeof cardBillPayments.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type OvertimeRecord = typeof overtimeRecords.$inferSelect;
export type NewOvertimeRecord = typeof overtimeRecords.$inferInsert;
