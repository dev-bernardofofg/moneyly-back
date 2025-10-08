/**
 * Tipos relacionados ao overview/dashboard
 */

import type { Category } from "../db/schema";
import type { TransactionWithCategory } from "../repositories/transaction.repository";
import type { CategoryChartData, TransactionStats } from "./transaction.types";

// Tipo para progresso de orçamento
export interface BudgetProgress {
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "safe" | "warning" | "danger";
}

// Tipo para progresso de objetivos
export interface GoalProgress {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  daysRemaining: number;
  status: "on_track" | "behind" | "completed";
}

// Tipo para alertas do sistema
export interface SystemAlert {
  type: "budget_warning" | "goal_deadline" | "high_expense" | "info";
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  actionable?: boolean;
  relatedId?: string;
}

// Tipo para resposta completa do overview
export interface OverviewResponse {
  stats: TransactionStats;
  period: {
    startDate: Date;
    endDate: Date;
    label: string;
  };
  budgetProgress: BudgetProgress[];
  goalsProgress: GoalProgress[];
  categoryExpenses: CategoryChartData[];
  alerts: SystemAlert[];
}

// Tipo para parâmetros de cálculo de gráfico
export interface ChartCalculationParams {
  transactions: TransactionWithCategory[];
  categories: Category[];
}
