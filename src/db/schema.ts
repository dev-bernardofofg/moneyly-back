import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Tabela de usuários
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // Tornando opcional para suportar OAuth
  googleId: text("google_id").unique(), // ID único do Google
  avatar: text("avatar"), // URL do avatar do Google
  monthlyIncome: decimal("monthly_income", { precision: 10, scale: 2 }).default(
    "0"
  ),
  financialDayStart: integer("financial_day_start").default(1), // Dia do mês que inicia o período financeiro
  financialDayEnd: integer("financial_day_end").default(31), // Dia do mês que termina o período financeiro
  firstAccess: boolean("first_access").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabela de transações
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  title: text("title").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  description: text("description"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // Tornando opcional para categorias globais
  name: text("name").notNull(),
  isGlobal: boolean("is_global").default(false).notNull(), // Nova coluna para categorias globais
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Nova tabela para controlar preferências de categorias globais por usuário
export const userCategoryPreferences = pgTable("user_category_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  isVisible: boolean("is_visible").default(true).notNull(), // Se a categoria global deve ser visível para o usuário
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabela de orçamentos por categoria
export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  monthlyLimit: decimal("monthly_limit", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabela de objetivos de poupança
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).default(
    "0"
  ),
  targetDate: timestamp("target_date").notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabela de marcos de progresso dos objetivos
export const goalMilestones = pgTable("goal_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  percentage: integer("percentage").notNull(), // 25, 50, 75, 100
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  isReached: boolean("is_reached").default(false),
  reachedAt: timestamp("reached_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relacionamentos
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  categories: many(categories),
  budgets: many(budgets),
  goals: many(goals),
  categoryPreferences: many(userCategoryPreferences),
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

export const userCategoryPreferencesRelations = relations(
  userCategoryPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userCategoryPreferences.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [userCategoryPreferences.categoryId],
      references: [categories.id],
    }),
  })
);

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
export type UserCategoryPreference =
  typeof userCategoryPreferences.$inferSelect;
export type NewUserCategoryPreference =
  typeof userCategoryPreferences.$inferInsert;
