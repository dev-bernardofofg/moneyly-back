/**
 * Interfaces para Repositories
 * Seguindo princípios SOLID (Interface Segregation + Dependency Inversion)
 */

import type {
  Category,
  CategoryBudget,
  Goal,
  GoalMilestone,
  NewCategory,
  NewCategoryBudget,
  NewGoal,
  NewGoalMilestone,
  NewTransaction,
  NewUser,
  NewUserCategoryPreference,
  Transaction,
  User,
  UserCategoryPreference,
} from "../../db/schema";
import type {
  PaginationQuery,
  PaginationResult,
} from "../../helpers/pagination";
import type { TransactionWithCategory } from "../transaction.repository";

// ============================================================
// USER REPOSITORY INTERFACE
// ============================================================
export interface IUserRepository {
  create(
    userData: Omit<NewUser, "id" | "createdAt" | "updatedAt">
  ): Promise<User>;
  findAll(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByIdWithoutPassword(id: string): Promise<Omit<User, "password"> | null>;
  updateGoogleInfo(
    id: string,
    googleInfo: { googleId: string; avatar?: string }
  ): Promise<User | null>;
  updateMonthlyIncome(id: string, monthlyIncome: number): Promise<User | null>;
  updateFinancialPeriod(
    id: string,
    financialDayStart: number,
    financialDayEnd: number
  ): Promise<User | null>;
  updateIncomeAndPeriod(
    id: string,
    monthlyIncome: number,
    financialDayStart: number,
    financialDayEnd: number
  ): Promise<User | null>;
  updateFirstAccess(id: string, firstAccess: boolean): Promise<User | null>;
}

// ============================================================
// TRANSACTION REPOSITORY INTERFACE
// ============================================================
export interface ITransactionRepository {
  create(
    transactionData: Omit<NewTransaction, "id" | "createdAt" | "updatedAt">
  ): Promise<Transaction>;
  findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery,
    filters?: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginationResult<TransactionWithCategory>>;
  findByUserId(
    userId: string,
    filters?: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<TransactionWithCategory[]>;
  findByIdAndUserId(id: string, userId: string): Promise<Transaction | null>;
  update(
    id: string,
    userId: string,
    updateData: Partial<
      Omit<NewTransaction, "id" | "userId" | "createdAt" | "updatedAt">
    >
  ): Promise<Transaction | null>;
  delete(id: string, userId: string): Promise<Transaction | null>;
  findAllByUserId(userId: string): Promise<TransactionWithCategory[]>;
  findByPeriodId(
    userId: string,
    periodId: string
  ): Promise<TransactionWithCategory[]>;
  findByPeriodIdOrDate(
    userId: string,
    periodId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<TransactionWithCategory[]>;
}

// ============================================================
// CATEGORY REPOSITORY INTERFACE
// ============================================================
export interface ICategoryRepository {
  create(categoryData: NewCategory): Promise<Category>;
  findByUserId(userId: string): Promise<Category[]>;
  findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery
  ): Promise<PaginationResult<Category>>;
  findByName(name: string): Promise<Category | null>;
  findByNameAndUserId(name: string, userId: string): Promise<Category | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Category | null>;
  update(id: string, categoryData: NewCategory): Promise<Category>;
  delete(id: string, userId: string): Promise<Category[]>;
  findGlobalCategories(): Promise<Category[]>;
  createGlobalCategory(name: string): Promise<Category>;
  hideGlobalCategoryForUser(
    userId: string,
    categoryId: string
  ): Promise<UserCategoryPreference>;
  showGlobalCategoryForUser(
    userId: string,
    categoryId: string
  ): Promise<{ message: string }>;
}

// ============================================================
// BUDGET REPOSITORY INTERFACE
// ============================================================
export interface IBudgetRepository {
  create(data: NewCategoryBudget): Promise<CategoryBudget>;
  findByUserId(userId: string): Promise<CategoryBudget[]>;
  findByCategoryId(categoryId: string): Promise<CategoryBudget | null>;
  findByIdAndUserId(id: string, userId: string): Promise<CategoryBudget | null>;
  update(
    id: string,
    data: Partial<NewCategoryBudget>
  ): Promise<CategoryBudget | null>;
  delete(id: string): Promise<boolean>;
  getBudgetWithCategory(userId: string): Promise<
    Array<{
      id: string;
      monthlyLimit: string;
      category: {
        id: string;
        name: string;
      };
    }>
  >;
}

// ============================================================
// GOAL REPOSITORY INTERFACE
// ============================================================
export interface IGoalRepository {
  create(data: NewGoal): Promise<Goal>;
  findById(id: string): Promise<Goal | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Goal | null>;
  findByUserId(userId: string): Promise<Goal[]>;
  findByUserIdActive(userId: string): Promise<Goal[]>;
  update(id: string, data: Partial<NewGoal>): Promise<Goal | null>;
  delete(id: string): Promise<boolean>;
  addAmount(id: string, amount: number): Promise<Goal | null>;
  createMilestone(data: NewGoalMilestone): Promise<GoalMilestone>;
  findMilestonesByGoalId(goalId: string): Promise<GoalMilestone[]>;
  updateMilestone(
    id: string,
    data: Partial<NewGoalMilestone>
  ): Promise<GoalMilestone | null>;
  getGoalWithMilestones(goalId: string): Promise<{
    id: string;
    userId: string;
    title: string;
    description: string | null;
    targetAmount: string;
    currentAmount: string | null;
    targetDate: Date;
    startDate: Date;
    isActive: boolean | null;
    createdAt: Date;
    updatedAt: Date;
    milestones: GoalMilestone[];
    progress: {
      percentage: number;
      remaining: number;
      daysRemaining: number;
    };
  } | null>;
}

// ============================================================
// USER CATEGORY PREFERENCES REPOSITORY INTERFACE
// ============================================================
export interface IUserCategoryPreferencesRepository {
  create(
    preferenceData: NewUserCategoryPreference
  ): Promise<UserCategoryPreference>;
  findByUserId(userId: string): Promise<UserCategoryPreference[]>;
  findByUserIdAndCategoryId(
    userId: string,
    categoryId: string
  ): Promise<UserCategoryPreference | null>;
  updateVisibility(
    userId: string,
    categoryId: string,
    isVisible: boolean
  ): Promise<UserCategoryPreference>;
  delete(userId: string, categoryId: string): Promise<void>;
  createDefaultPreferencesForUser(
    userId: string,
    globalCategoryIds: string[]
  ): Promise<UserCategoryPreference[]>;
}

// ============================================================
// FINANCIAL PERIOD REPOSITORY INTERFACE
// ============================================================
export interface IFinancialPeriodRepository {
  create(data: {
    userId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  }): Promise<{
    id: string;
    userId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      id: string;
      userId: string;
      startDate: Date;
      endDate: Date;
      isActive: boolean | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;
  findActiveByUser(userId: string): Promise<
    Array<{
      id: string;
      userId: string;
      startDate: Date;
      endDate: Date;
      isActive: boolean | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;
  deactivatePeriods(userId: string): Promise<void>;
  findOrCreatePeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    id: string;
    userId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  findById(
    periodId: string,
    userId: string
  ): Promise<
    | {
        id: string;
        userId: string;
        startDate: Date;
        endDate: Date;
        isActive: boolean | null;
        createdAt: Date;
        updatedAt: Date;
      }
    | undefined
  >;
}
