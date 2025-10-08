/**
 * Testes unitários para OverviewService
 */

import {
  calculateExpensesByCategory,
  calculateMonthlyHistory,
  calculateStats,
} from "../../../src/helpers/handlers/overview-handlers";
import { CategoryRepository } from "../../../src/repositories/categories.repository";
import { TransactionRepository } from "../../../src/repositories/transaction.repository";
import { getBudgetProgressService } from "../../../src/services/budget.service";
import { getGoalsProgressService } from "../../../src/services/goal.service";
import {
  calculateAlerts,
  calculatePlanningStats,
  getDashboardOverviewService,
  getPlannerOverviewService,
  getStatsOverview,
  getTransactionsByUserId,
} from "../../../src/services/overview.service";

// Mock dos módulos
jest.mock("../../../src/repositories/categories.repository");
jest.mock("../../../src/repositories/transaction.repository");
jest.mock("../../../src/services/budget.service");
jest.mock("../../../src/services/goal.service");
jest.mock("../../../src/helpers/handlers/overview-handlers");

describe("OverviewService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTransactionsByUserId", () => {
    const mockUserId = "user-123";
    const mockDates = {
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    };

    const mockTransactions = [
      {
        id: "trans-1",
        type: "expense",
        amount: "100",
        category: { id: "cat-1", name: "Alimentação" },
      },
      {
        id: "trans-2",
        type: "income",
        amount: "500",
        category: { id: "cat-2", name: "Salário" },
      },
    ];

    it("deve retornar transações por data", async () => {
      (TransactionRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockTransactions
      );

      const result = await getTransactionsByUserId(mockUserId, mockDates);

      expect(TransactionRepository.findByUserId).toHaveBeenCalledWith(
        mockUserId,
        mockDates
      );
      expect(result).toEqual({ transactions: mockTransactions });
    });

    it("deve retornar transações por periodId quando fornecido", async () => {
      const mockPeriodId = "period-123";
      (TransactionRepository.findByPeriodId as jest.Mock).mockResolvedValue(
        mockTransactions
      );

      const result = await getTransactionsByUserId(
        mockUserId,
        mockDates,
        undefined,
        mockPeriodId
      );

      expect(TransactionRepository.findByPeriodId).toHaveBeenCalledWith(
        mockUserId,
        mockPeriodId
      );
      expect(result.transactions).toEqual(mockTransactions);
    });

    it("deve usar fallback por data quando busca por periodId falha", async () => {
      const mockPeriodId = "period-123";
      (TransactionRepository.findByPeriodId as jest.Mock).mockRejectedValue(
        new Error("Period not found")
      );
      (TransactionRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockTransactions
      );

      const result = await getTransactionsByUserId(
        mockUserId,
        mockDates,
        undefined,
        mockPeriodId
      );

      expect(TransactionRepository.findByPeriodId).toHaveBeenCalledWith(
        mockUserId,
        mockPeriodId
      );
      expect(TransactionRepository.findByUserId).toHaveBeenCalledWith(
        mockUserId,
        mockDates
      );
      expect(result.transactions).toEqual(mockTransactions);
    });

    it("deve retornar períodos financeiros quando financial é fornecido", async () => {
      const mockFinancial = { startDay: 1, endDay: 31 };
      (TransactionRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockTransactions
      );

      const result = await getTransactionsByUserId(
        mockUserId,
        mockDates,
        mockFinancial
      );

      expect(result).toHaveProperty("availablePeriods");
      expect(result).toHaveProperty("selectedPeriod");
    });
  });

  describe("getStatsOverview", () => {
    const mockTransactions = [
      {
        id: "trans-1",
        type: "expense" as const,
        amount: "100",
        title: "Test",
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        periodId: null,
        description: null,
        category: { id: "cat-1", name: "Alimentação" },
      },
      {
        id: "trans-2",
        type: "income" as const,
        amount: "500",
        title: "Test",
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        periodId: null,
        description: null,
        category: { id: "cat-2", name: "Salário" },
      },
    ];

    const mockStats = {
      totalIncome: 500,
      totalExpenses: 100,
      balance: 400,
      transactionCount: 2,
    };

    it("deve calcular estatísticas corretamente", async () => {
      (calculateStats as jest.Mock).mockReturnValue(mockStats);

      const result = await getStatsOverview(mockTransactions as any, 5000);

      expect(calculateStats).toHaveBeenCalledWith(mockTransactions, 5000);
      expect(result).toEqual(mockStats);
    });
  });

  describe("getDashboardOverviewService", () => {
    const mockUserId = "user-123";
    const mockMonthlyIncome = 5000;
    const mockDates = {
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    };

    const mockTransactions = [
      {
        id: "trans-1",
        type: "expense",
        amount: "100",
        category: { id: "cat-1", name: "Alimentação" },
      },
    ];

    const mockCategories = [
      { id: "cat-1", name: "Alimentação", userId: mockUserId },
    ];

    const mockStats = {
      totalIncome: 5000,
      totalExpenses: 100,
      balance: 4900,
    };

    const mockMonthlyHistory = [
      { month: "2024-01", income: 5000, expenses: 100 },
    ];

    const mockExpensesByCategory = [
      { category: "Alimentação", amount: 100, percentage: 100 },
    ];

    it("deve retornar overview completo do dashboard", async () => {
      (TransactionRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockTransactions
      );
      (CategoryRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockCategories
      );
      (calculateStats as jest.Mock).mockResolvedValue(mockStats);
      (calculateMonthlyHistory as jest.Mock).mockResolvedValue(
        mockMonthlyHistory
      );
      (calculateExpensesByCategory as jest.Mock).mockResolvedValue(
        mockExpensesByCategory
      );

      const result = await getDashboardOverviewService(
        mockUserId,
        mockMonthlyIncome,
        mockDates
      );

      expect(result).toHaveProperty("stats");
      expect(result).toHaveProperty("monthlyHistory");
      expect(result).toHaveProperty("expensesByCategory");
      expect(result).toHaveProperty("periodTransactions");
      expect(TransactionRepository.findByUserId).toHaveBeenCalledWith(
        mockUserId,
        mockDates
      );
      expect(CategoryRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe("calculatePlanningStats", () => {
    const mockBudgetProgress = [
      { monthlyLimit: "1000", category: { name: "Alimentação" } },
      { monthlyLimit: "500", category: { name: "Transporte" } },
    ];

    const mockGoalsProgress = [
      { targetAmount: "10000", currentAmount: "5000", title: "Viagem" },
      { targetAmount: "5000", currentAmount: "1000", title: "Emergência" },
    ];

    const mockMonthlyIncome = 5000;

    it("deve calcular estatísticas de planejamento corretamente", () => {
      const result = calculatePlanningStats(
        mockBudgetProgress,
        mockGoalsProgress,
        mockMonthlyIncome
      );

      expect(result).toEqual({
        totalBudgeted: 1500, // 1000 + 500
        totalSavingsGoal: 15000, // 10000 + 5000
        totalSaved: 6000, // 5000 + 1000
        savingsProgress: 40, // (6000 / 15000) * 100
        budgetPercentage: 30, // (1500 / 5000) * 100
        savingsPercentage: 300, // (15000 / 5000) * 100
        remainingToSave: 9000, // 15000 - 6000
        availableForBudget: 0, // max(0, 5000 - 15000)
      });
    });

    it("deve retornar 0 para savingsProgress quando totalSavingsGoal é 0", () => {
      const result = calculatePlanningStats(
        mockBudgetProgress,
        [],
        mockMonthlyIncome
      );

      expect(result.savingsProgress).toBe(0);
      expect(result.totalSavingsGoal).toBe(0);
      expect(result.totalSaved).toBe(0);
    });

    it("deve retornar 0 para budgetPercentage quando monthlyIncome é 0", () => {
      const result = calculatePlanningStats(
        mockBudgetProgress,
        mockGoalsProgress,
        0
      );

      expect(result.budgetPercentage).toBe(0);
      expect(result.savingsPercentage).toBe(0);
    });

    it("deve calcular availableForBudget corretamente", () => {
      const result = calculatePlanningStats(
        mockBudgetProgress,
        [{ targetAmount: "1000", currentAmount: "0", title: "Meta" }],
        5000
      );

      expect(result.availableForBudget).toBe(4000); // 5000 - 1000
    });
  });

  describe("calculateAlerts", () => {
    const mockStats = {
      budgetPercentage: 50,
      savingsPercentage: 20,
    };

    const mockMonthlyIncome = 5000;

    it("deve gerar alerta de orçamento excedido", () => {
      const mockBudgetProgress = [
        {
          percentage: 105,
          category: { name: "Alimentação" },
        },
      ];

      const result = calculateAlerts(
        mockStats,
        mockMonthlyIncome,
        mockBudgetProgress,
        []
      );

      expect(result).toContainEqual(
        expect.objectContaining({
          type: "danger",
          message: expect.stringContaining("Alimentação foi excedido"),
          priority: "high",
        })
      );
    });

    it("deve gerar alerta de orçamento em 90%", () => {
      const mockBudgetProgress = [
        {
          percentage: 92,
          category: { name: "Transporte" },
        },
      ];

      const result = calculateAlerts(
        mockStats,
        mockMonthlyIncome,
        mockBudgetProgress,
        []
      );

      expect(result).toContainEqual(
        expect.objectContaining({
          type: "warning",
          message: expect.stringContaining("Transporte está em 90%"),
          priority: "medium",
        })
      );
    });

    it("deve gerar alerta de objetivo próximo do prazo", () => {
      const mockGoalsProgress = [
        {
          title: "Viagem",
          progress: {
            percentage: 50,
            daysRemaining: 5,
          },
        },
      ];

      const result = calculateAlerts(
        mockStats,
        mockMonthlyIncome,
        [],
        mockGoalsProgress
      );

      expect(result).toContainEqual(
        expect.objectContaining({
          type: "warning",
          priority: "high",
        })
      );
      expect(
        result.some(
          (alert: any) =>
            alert.message.includes("Viagem") && alert.message.includes("5 dias")
        )
      ).toBe(true);
    });

    it("deve gerar alerta de objetivo atrasado", () => {
      const mockGoalsProgress = [
        {
          title: "Emergência",
          progress: {
            percentage: 30,
            daysRemaining: -10,
          },
        },
      ];

      const result = calculateAlerts(
        mockStats,
        mockMonthlyIncome,
        [],
        mockGoalsProgress
      );

      expect(result).toContainEqual(
        expect.objectContaining({
          type: "danger",
          priority: "high",
        })
      );
      expect(
        result.some(
          (alert: any) =>
            alert.message.includes("Emergência") &&
            alert.message.includes("atrasado")
        )
      ).toBe(true);
    });

    it("deve gerar alerta de orçamento excedendo rendimento", () => {
      const statsWithHighBudget = {
        budgetPercentage: 110,
        savingsPercentage: 20,
      };

      const result = calculateAlerts(
        statsWithHighBudget,
        mockMonthlyIncome,
        [],
        []
      );

      expect(result).toContainEqual(
        expect.objectContaining({
          type: "danger",
          message: expect.stringContaining("excede seu rendimento"),
          priority: "high",
        })
      );
    });

    it("deve gerar alerta de poupança alta", () => {
      const statsWithHighSavings = {
        budgetPercentage: 30,
        savingsPercentage: 60,
      };

      const result = calculateAlerts(
        statsWithHighSavings,
        mockMonthlyIncome,
        [],
        []
      );

      expect(result).toContainEqual(
        expect.objectContaining({
          type: "info",
          message: expect.stringContaining("mais de 50%"),
          priority: "low",
        })
      );
    });

    it("deve ordenar alertas por prioridade (high > medium > low)", () => {
      const mockBudgetProgress = [
        { percentage: 85, category: { name: "Cat1" } }, // low
        { percentage: 95, category: { name: "Cat2" } }, // medium
        { percentage: 105, category: { name: "Cat3" } }, // high
      ];

      const result = calculateAlerts(
        mockStats,
        mockMonthlyIncome,
        mockBudgetProgress,
        []
      );

      expect(result[0].priority).toBe("high");
      expect(result[result.length - 1].priority).toBe("low");
    });

    it("deve retornar array vazio quando não há alertas", () => {
      const result = calculateAlerts(mockStats, mockMonthlyIncome, [], []);

      expect(result).toEqual([]);
    });
  });

  describe("getPlannerOverviewService", () => {
    const mockUserId = "user-123";
    const mockMonthlyIncome = 5000;

    const mockBudgetProgress = [
      {
        monthlyLimit: "1000",
        category: { name: "Alimentação" },
        percentage: 50,
      },
    ];

    const mockGoalsProgress = [
      {
        targetAmount: "10000",
        currentAmount: "5000",
        title: "Viagem",
        progress: { percentage: 50, daysRemaining: 30 },
      },
    ];

    it("deve retornar overview completo do planejamento", async () => {
      (getBudgetProgressService as jest.Mock).mockResolvedValue(
        mockBudgetProgress
      );
      (getGoalsProgressService as jest.Mock).mockResolvedValue(
        mockGoalsProgress
      );

      const result = await getPlannerOverviewService(
        mockUserId,
        mockMonthlyIncome
      );

      expect(result).toHaveProperty("stats");
      expect(result).toHaveProperty("alerts");
      expect(getBudgetProgressService).toHaveBeenCalledWith(mockUserId);
      expect(getGoalsProgressService).toHaveBeenCalledWith(mockUserId);
    });

    it("deve calcular stats e alerts corretamente", async () => {
      (getBudgetProgressService as jest.Mock).mockResolvedValue(
        mockBudgetProgress
      );
      (getGoalsProgressService as jest.Mock).mockResolvedValue(
        mockGoalsProgress
      );

      const result = await getPlannerOverviewService(
        mockUserId,
        mockMonthlyIncome
      );

      expect(result.stats).toHaveProperty("totalBudgeted");
      expect(result.stats).toHaveProperty("totalSavingsGoal");
      expect(result.stats).toHaveProperty("totalSaved");
      expect(result.stats).toHaveProperty("savingsProgress");
      expect(result.alerts).toBeInstanceOf(Array);
    });
  });
});
