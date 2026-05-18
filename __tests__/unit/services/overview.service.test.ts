/**
 * Testes unitários para overview.service (reescrito contra a API atual).
 * Funções puras testadas direto; serviços que tocam DB com mocks.
 */
import {
  calculateAlerts,
  calculatePlanningStats,
  getDashboardOverviewService,
  getPlannerOverviewService,
  getStatsOverview,
  getTransactionsByUserId,
} from "../../../src/services/overview.service";
import { financialPeriodRepository } from "../../../src/repositories/financial-period.repository";
import { transactionRepository } from "../../../src/repositories/transaction.repository";
import { getBudgetProgressService } from "../../../src/services/budget.service";
import { getGoalsProgressService } from "../../../src/services/goal.service";

jest.mock("../../../src/repositories/financial-period.repository");
jest.mock("../../../src/repositories/transaction.repository");
jest.mock("../../../src/services/budget.service");
jest.mock("../../../src/services/goal.service");

const fpRepo = financialPeriodRepository as jest.Mocked<
  typeof financialPeriodRepository
>;
const txRepo = transactionRepository as jest.Mocked<
  typeof transactionRepository
>;
const mockedBudgetProgress = getBudgetProgressService as jest.Mock;
const mockedGoalsProgress = getGoalsProgressService as jest.Mock;

const USER = "user-123";

const tx = (type: "income" | "expense", amount: string, catId = "c1") => ({
  id: "t" + Math.random(),
  type,
  title: "x",
  amount,
  description: null,
  date: new Date(),
  periodId: null,
  recurringTransactionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: catId, name: "Cat" },
});

beforeEach(() => jest.clearAllMocks());

describe("getStatsOverview (pure via handlers)", () => {
  it("sums income/expense and computes balance/percentUsed", async () => {
    const r = await getStatsOverview(
      [tx("income", "1000"), tx("expense", "400")] as never,
      2000
    );
    expect(r.totalIncome).toBe(1000);
    expect(r.totalExpense).toBe(400);
    // balance = monthlyIncome + income - expense
    expect(r.balance).toBe(2000 + 1000 - 400);
    expect(r.percentUsed).toBe(20); // 400/2000*100
  });
});

describe("getDashboardOverviewService", () => {
  it("returns stats + chart + recentTransactions", async () => {
    const r = await getDashboardOverviewService(3000, [
      tx("expense", "100", "c1"),
      tx("income", "500", "c2"),
    ] as never);

    expect(r).toHaveProperty("stats");
    expect(r).toHaveProperty("chart");
    expect(r).toHaveProperty("recentTransactions");
    expect(Array.isArray(r.recentTransactions)).toBe(true);
    expect(r.chart).toHaveProperty("data");
    expect(r.chart).toHaveProperty("categories");
  });
});

describe("calculatePlanningStats (pure)", () => {
  it("aggregates budgeted/savings and percentages", () => {
    const budgetProgress = [
      { monthlyLimit: "1000" },
      { monthlyLimit: "500" },
    ] as never;
    const goalsProgress = [
      { targetAmount: "2000", currentAmount: "500" },
    ] as never;

    const r = calculatePlanningStats(budgetProgress, goalsProgress, 4000);

    expect(r.totalBudgeted).toBe(1500);
    expect(r.totalSavingsGoal).toBe(2000);
    expect(r.totalSaved).toBe(500);
    expect(r.savingsProgress).toBe(25); // 500/2000*100
    expect(r.budgetPercentage).toBe(37.5); // 1500/4000*100
    expect(r.remainingToSave).toBe(1500);
    expect(r.availableForBudget).toBe(2000); // 4000-2000
  });

  it("monthlyIncome 0 → percentages 0, no division by zero", () => {
    const r = calculatePlanningStats([], [], 0);
    expect(r.budgetPercentage).toBe(0);
    expect(r.savingsPercentage).toBe(0);
  });
});

describe("calculateAlerts (pure)", () => {
  it("emits danger for exceeded budget and sorts by priority", () => {
    const budgetProgress = [
      { percentage: 120, category: { name: "Comida" } },
      { percentage: 85, category: { name: "Lazer" } },
    ] as never;
    const stats = {
      budgetPercentage: 50,
      savingsPercentage: 0,
    } as never;

    const alerts = calculateAlerts(stats, 1000, budgetProgress, []);

    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(alerts[0]!.priority).toBe("high"); // ordenado: high primeiro
    expect(alerts.some((a) => a.type === "danger")).toBe(true);
  });

  it("no alerts when everything healthy", () => {
    const alerts = calculateAlerts(
      { budgetPercentage: 10, savingsPercentage: 0 } as never,
      1000,
      [],
      []
    );
    expect(alerts).toEqual([]);
  });
});

describe("getPlannerOverviewService", () => {
  it("combines stats + alerts from budget/goal services", async () => {
    mockedBudgetProgress.mockResolvedValue([{ monthlyLimit: "1000" }]);
    mockedGoalsProgress.mockResolvedValue([
      { targetAmount: "2000", currentAmount: "0" },
    ]);

    const r = await getPlannerOverviewService(USER, 5000);

    expect(mockedBudgetProgress).toHaveBeenCalledWith(USER);
    expect(mockedGoalsProgress).toHaveBeenCalledWith(USER);
    expect(r).toHaveProperty("stats");
    expect(r).toHaveProperty("alerts");
    expect(r.stats.totalBudgeted).toBe(1000);
  });
});

describe("getTransactionsByUserId", () => {
  it("existing periodId → fetch by period", async () => {
    fpRepo.findAllByUserWithTransactionCount.mockResolvedValue([
      {
        id: "sel",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        transactionCount: 2,
        isActive: true,
      },
    ] as never);
    const txs = [tx("expense", "100")];
    txRepo.findByPeriodId.mockResolvedValue(txs as never);

    const r = await getTransactionsByUserId(USER, undefined, "sel");

    expect(txRepo.findByPeriodId).toHaveBeenCalledWith(USER, "sel");
    expect(r.transactions).toEqual(txs);
    expect(r.selectedPeriod?.id).toBe("sel");
  });

  it("nonexistent periodId → empty transactions", async () => {
    fpRepo.findAllByUserWithTransactionCount.mockResolvedValue([] as never);

    const r = await getTransactionsByUserId(USER, undefined, "nope");

    expect(r.transactions).toEqual([]);
    expect(r.selectedPeriod).toBeUndefined();
  });
});
