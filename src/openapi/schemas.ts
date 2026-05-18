/**
 * Schemas Zod de RESPONSE registrados como components.schemas (I1 parte-2).
 *
 * Fonte: shapes reais devolvidos pelos controllers/services/handlers.
 * Invariantes (ver moneyly/.specs/02-shared-domain.md):
 *  - dinheiro = STRING decimal (Drizzle decimal → string; ResponseHandler.normalizeDecimals mantém string)
 *  - datas = STRING (Date serializa p/ ISO no JSON; algumas já vêm formatadas dd/MM/yyyy)
 *  - valores derivados/calculados em runtime = number
 */
import { registry, z } from "./registry";

const money = z.string().openapi({ example: "1234.50", description: "Valor decimal como string" });
const isoDate = z.string().openapi({ example: "2026-05-17T00:00:00.000Z" });

/* ───────── entidades base ───────── */

export const TransactionCategorySchema = registry.register(
  "TransactionCategory",
  z.object({ id: z.string().uuid(), name: z.string() })
);

export const TransactionSchema = registry.register(
  "Transaction",
  z.object({
    id: z.string().uuid(),
    type: z.enum(["income", "expense"]),
    title: z.string(),
    amount: money,
    description: z.string().nullable(),
    date: isoDate,
    periodId: z.string().uuid().nullable(),
    recurringTransactionId: z.string().uuid().nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
    category: TransactionCategorySchema,
  })
);

export const CategorySchema = registry.register(
  "Category",
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid().nullable(),
    name: z.string(),
    isGlobal: z.boolean(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
);

export const UserSchema = registry.register(
  "User",
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    googleId: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    monthlyIncome: z.union([z.string(), z.number()]),
    financialDayStart: z.number().int(),
    financialDayEnd: z.number().int(),
    firstAccess: z.boolean().nullable(),
    createdAt: isoDate,
  })
);

/* ───────── auth ───────── */

export const AuthSessionSchema = registry.register(
  "AuthSession",
  z.object({
    user: UserSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  })
);

export const AuthRefreshSchema = registry.register(
  "AuthRefresh",
  z.object({
    user: UserSchema,
    accessToken: z.string(),
  })
);

/* ───────── user settings ───────── */

export const IncomeUpdateSchema = registry.register(
  "IncomeUpdate",
  z.object({
    monthlyIncome: z.union([z.string(), z.number()]),
    firstAccess: z.boolean(),
  })
);

export const FinancialPeriodUpdateSchema = registry.register(
  "FinancialPeriodUpdate",
  z.object({
    financialDayStart: z.number().int(),
    financialDayEnd: z.number().int(),
    firstAccess: z.boolean(),
  })
);

export const IncomeAndPeriodUpdateSchema = registry.register(
  "IncomeAndPeriodUpdate",
  z.object({
    monthlyIncome: z.union([z.string(), z.number()]),
    financialDayStart: z.number().int(),
    financialDayEnd: z.number().int(),
    firstAccess: z.boolean(),
  })
);

export const GoalSchema = registry.register(
  "Goal",
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    targetAmount: money,
    currentAmount: money.nullable(),
    targetDate: isoDate,
    startDate: isoDate,
    isActive: z.boolean().nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
);

export const BudgetSchema = registry.register(
  "Budget",
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    categoryId: z.string().uuid(),
    monthlyLimit: money,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
);

export const BudgetProgressSchema = registry.register(
  "BudgetProgress",
  z.object({
    id: z.string().uuid(),
    monthlyLimit: money.nullable(),
    category: TransactionCategorySchema,
    spent: z.number(),
    remaining: z.number(),
    percentage: z.number(),
    status: z.string().openapi({ description: "safe | attention | warning | exceeded" }),
  })
);

export const RecurringTransactionSchema = registry.register(
  "RecurringTransaction",
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    type: z.enum(["income", "expense"]),
    title: z.string(),
    amount: money,
    categoryId: z.string().uuid(),
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    dayOfMonth: z.number().int().nullable(),
    dayOfWeek: z.number().int().nullable(),
    startDate: isoDate.nullable(),
    totalInstallments: z.number().int().nullable(),
    executedInstallments: z.number().int(),
    nextExecution: isoDate,
    isActive: z.boolean(),
    description: z.string().nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
);

export const FinancialPeriodSchema = registry.register(
  "FinancialPeriod",
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    startDate: isoDate,
    endDate: isoDate,
    isActive: z.boolean().nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
);

export const FinancialPeriodSummarySchema = registry.register(
  "FinancialPeriodSummary",
  z.object({
    id: z.string().uuid(),
    startDate: isoDate,
    endDate: isoDate,
    label: z.string(),
    transactionCount: z.number().int(),
    isStored: z.boolean().optional(),
    isCurrent: z.boolean().nullable().optional(),
  })
);

/* ───────── agregados / overview ───────── */

export const MonthlySummaryItemSchema = registry.register(
  "MonthlySummaryItem",
  z.object({
    month: z.string().openapi({ example: "2026-04" }),
    label: z.string().openapi({ example: "Abril 2026" }),
    income: z.number(),
    expense: z.number(),
    balance: z.number(),
  })
);

export const RecentTransactionItemSchema = registry.register(
  "RecentTransactionItem",
  z.object({
    id: z.string().uuid(),
    type: z.enum(["income", "expense"]),
    amount: z.number(),
    date: z.string().openapi({ example: "17/05/2026", description: "dd/MM/yyyy" }),
    category: z.string(),
    description: z.string(),
  })
);

export const DashboardStatsSchema = registry.register(
  "DashboardStats",
  z.object({
    totalIncome: z.number(),
    totalExpense: z.number(),
    balance: z.number(),
    percentUsed: z.number().nullable(),
    remainingBudget: z.number(),
  })
);

const ChartCategoryItem = z.object({
  name: z.string(),
  income: z.number(),
  expense: z.number(),
});

export const DashboardOverviewSchema = registry.register(
  "DashboardOverview",
  z.object({
    stats: DashboardStatsSchema,
    selectedPeriod: z
      .object({
        id: z.string().uuid(),
        startDate: isoDate,
        endDate: isoDate,
        label: z.string(),
        transactionCount: z.number().int(),
        description: z.string(),
      })
      .nullable(),
    availablePeriods: z.array(FinancialPeriodSummarySchema),
    chart: z.object({
      data: z.array(ChartCategoryItem),
      categories: z.array(z.object({ id: z.string(), name: z.string() })),
    }),
    recentTransactions: z.array(RecentTransactionItemSchema),
    transactionsCount: z.number().int(),
    previews: z.object({
      subscriptions: z.object({
        count: z.number().int(),
        topMonthlyCost: z.number().nullable(),
        topTitle: z.string().nullable(),
      }),
      comparison: z.object({
        signal: z.enum(["up", "down", "stable"]),
        deltaPct: z.number().nullable(),
        topHighlight: z.string().nullable(),
      }),
    }),
  })
);

export const FinancialInsightsSchema = registry.register(
  "FinancialInsights",
  z.object({
    currentPeriod: z.object({
      daysElapsed: z.number().int(),
      totalDays: z.number().int(),
      completionPercentage: z.number(),
      currentExpense: z.number(),
      projectedExpense: z.number(),
      isOnTrack: z.boolean(),
    }),
    trend: z.object({
      previousMonth: MonthlySummaryItemSchema.nullable(),
      currentMonth: MonthlySummaryItemSchema.nullable(),
      expenseChange: z.number().nullable(),
      incomeChange: z.number().nullable(),
    }),
    allTime: z.object({
      averageMonthlyExpense: z.number(),
      averageMonthlyIncome: z.number(),
      bestMonth: MonthlySummaryItemSchema.nullable(),
      worstMonth: MonthlySummaryItemSchema.nullable(),
      totalMonths: z.number().int(),
      totalTransactions: z.number().int(),
    }),
    topCategories: z.array(
      z.object({
        name: z.string(),
        amount: z.number(),
        percentage: z.number(),
      })
    ),
    monthlyHistory: z.array(MonthlySummaryItemSchema),
  })
);

const PlanningAlertSchema = z.object({
  type: z.enum(["danger", "warning", "info"]),
  message: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  category: z.string().optional(),
  goal: z.string().optional(),
  percentage: z.number().optional(),
  daysRemaining: z.number().optional(),
});

export const PlannerOverviewSchema = registry.register(
  "PlannerOverview",
  z.object({
    stats: z.object({
      totalBudgeted: z.number(),
      totalSavingsGoal: z.number(),
      totalSaved: z.number(),
      savingsProgress: z.number(),
      budgetPercentage: z.number(),
      savingsPercentage: z.number(),
      remainingToSave: z.number(),
      availableForBudget: z.number(),
    }),
    currentPeriod: z.object({
      startDate: isoDate,
      endDate: isoDate,
      description: z.string(),
    }),
    alerts: z.array(PlanningAlertSchema),
  })
);

const compareSignal = z.enum(["up", "down", "stable"]);

export const ComparativeInsightsSchema = registry.register(
  "ComparativeInsights",
  z.object({
    basis: z.object({
      periodsCompared: z.number().int(),
      currentPeriod: z.object({
        startDate: z.string(),
        endDate: z.string(),
        label: z.string(),
      }),
    }),
    totals: z.object({
      currentExpense: z.number(),
      averageExpense: z.number(),
      deltaPct: z.number().nullable(),
      signal: compareSignal,
    }),
    byCategory: z.array(
      z.object({
        categoryId: z.string().uuid(),
        categoryName: z.string(),
        currentExpense: z.number(),
        averageExpense: z.number(),
        deltaPct: z.number().nullable(),
        signal: compareSignal,
        message: z.string(),
      })
    ),
    highlights: z.array(z.string()),
  })
);

export const SubscriptionCandidateSchema = registry.register(
  "SubscriptionCandidate",
  z.object({
    title: z.string(),
    categoryId: z.string().uuid(),
    categoryName: z.string(),
    averageAmount: z.number(),
    occurrences: z.number().int(),
    cadence: z.enum(["weekly", "monthly", "yearly"]),
    firstDate: isoDate,
    lastDate: isoDate,
    nextEstimatedDate: isoDate,
    monthlyCost: z.number(),
  })
);

export const NotificationSchema = registry.register(
  "Notification",
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    type: z.enum(["budget_alert"]),
    severity: z.enum(["info", "warning", "danger"]),
    title: z.string(),
    message: z.string(),
    relatedId: z.string().uuid().nullable(),
    periodId: z.string().uuid().nullable(),
    dedupeKey: z.string(),
    isRead: z.boolean(),
    createdAt: isoDate,
  })
);

export const TransactionSummarySchema = registry.register(
  "TransactionSummary",
  z.object({
    totalIncome: z.number(),
    totalExpenses: z.number(),
    monthlyIncome: z.number(),
    balance: z.number(),
    percentUsed: z.number().nullable(),
    byCategory: z.record(z.string(), z.number()),
    alert: z.string().nullable(),
  })
);

export const CurrentPeriodSummarySchema = registry.register(
  "CurrentPeriodSummary",
  z.object({
    currentPeriod: z.object({
      startDate: isoDate,
      endDate: isoDate,
      description: z.string(),
    }),
    totalIncome: z.number(),
    totalExpenses: z.number(),
    monthlyIncome: z.number(),
    balance: z.number(),
    percentUsed: z.number().nullable(),
    byCategory: z.record(z.string(), z.number()),
    alert: z.string().nullable(),
    transactionsCount: z.number().int(),
  })
);

export const ForecastResponseSchema = registry.register(
  "ForecastResponse",
  z.object({
    period: z.object({
      id: z.string().uuid(),
      startDate: isoDate,
      endDate: isoDate,
      label: z.string(),
    }),
    realized: z.object({
      income: z.number(),
      expense: z.number(),
      balance: z.number(),
    }),
    projected: z.object({
      recurringIncome: z.number(),
      recurringExpense: z.number(),
      occurrences: z.array(
        z.object({
          recurringTransactionId: z.string().uuid(),
          title: z.string(),
          type: z.enum(["income", "expense"]),
          amount: z.number(),
          date: isoDate,
        })
      ),
    }),
    projectedEndBalance: z.number(),
    asOf: isoDate,
  })
);

export const TransactionListSummarySchema = registry.register(
  "TransactionListSummary",
  z.object({
    totalExpense: z.number(),
    totalIncome: z.number(),
    monthlyIncome: z.union([z.string(), z.number()]),
    percentUsed: z.number().nullable(),
    alert: z.string().nullable(),
  })
);
