import { relations } from "drizzle-orm";
import {
  boolean,
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
  monthlyIncome: integer("monthly_income").default(0),
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
  amount: integer("amount").notNull(),
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
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabela de orçamentos por categoria
export const categoryBudgets = pgTable("category_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  monthlyLimit: integer("monthly_limit").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabela de objetivos de poupança
export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").default(0),
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
    .references(() => savingsGoals.id, { onDelete: "cascade" }),
  percentage: integer("percentage").notNull(), // 25, 50, 75, 100
  amount: integer("amount").notNull(),
  isReached: boolean("is_reached").default(false),
  reachedAt: timestamp("reached_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relacionamentos
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  categories: many(categories),
  categoryBudgets: many(categoryBudgets),
  savingsGoals: many(savingsGoals),
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
  budgets: many(categoryBudgets),
}));

export const categoryBudgetsRelations = relations(
  categoryBudgets,
  ({ one }) => ({
    user: one(users, {
      fields: [categoryBudgets.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [categoryBudgets.categoryId],
      references: [categories.id],
    }),
  })
);

export const savingsGoalsRelations = relations(
  savingsGoals,
  ({ one, many }) => ({
    user: one(users, {
      fields: [savingsGoals.userId],
      references: [users.id],
    }),
    milestones: many(goalMilestones),
  })
);

export const goalMilestonesRelations = relations(goalMilestones, ({ one }) => ({
  goal: one(savingsGoals, {
    fields: [goalMilestones.goalId],
    references: [savingsGoals.id],
  }),
}));

// Tipos TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryBudget = typeof categoryBudgets.$inferSelect;
export type NewCategoryBudget = typeof categoryBudgets.$inferInsert;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type NewSavingsGoal = typeof savingsGoals.$inferInsert;
export type GoalMilestone = typeof goalMilestones.$inferSelect;
export type NewGoalMilestone = typeof goalMilestones.$inferInsert;
