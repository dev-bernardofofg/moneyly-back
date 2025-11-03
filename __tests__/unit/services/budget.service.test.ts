/**
 * Testes unitários para BudgetService
 */

import { BudgetRepository } from "../../../src/repositories/budget.repository";
import { TransactionRepository } from "../../../src/repositories/transaction.repository";
import { UserRepository } from "../../../src/repositories/user.repository";
import {
  createBudgetService,
  deleteBudget,
  deleteBudgetService,
  getBudgetProgressService,
  getBudgetStatus,
  getUserBudgets,
  getUserBudgetsService,
  updateBudget,
  updateBudgetService,
} from "../../../src/services/budget.service";
import { validateBudgetExists } from "../../../src/validations/budget.validation";
import { validateUserNotAuthenticated } from "../../../src/validations/user.validation";

// Mock dos módulos
jest.mock("../../../src/repositories/budget.repository");
jest.mock("../../../src/repositories/transaction.repository");
jest.mock("../../../src/repositories/user.repository");
jest.mock("../../../src/validations/user.validation");
jest.mock("../../../src/validations/budget.validation");

describe("BudgetService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createBudgetService", () => {
    const mockUserId = "user-123";
    const mockBudgetData = {
      categoryId: "cat-123",
      monthlyLimit: 1000,
    };

    const mockCreatedBudget = {
      id: "budget-123",
      userId: mockUserId,
      categoryId: "cat-123",
      monthlyLimit: "1000",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("deve criar um orçamento com sucesso", async () => {
      (validateUserNotAuthenticated as jest.Mock).mockResolvedValue({
        id: mockUserId,
      });
      (BudgetRepository.create as jest.Mock).mockResolvedValue(
        mockCreatedBudget
      );

      const result = await createBudgetService(mockUserId, mockBudgetData);

      expect(validateUserNotAuthenticated).toHaveBeenCalledWith(mockUserId);
      expect(BudgetRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        categoryId: mockBudgetData.categoryId,
        monthlyLimit: mockBudgetData.monthlyLimit.toString(),
      });
      expect(result).toEqual(mockCreatedBudget);
    });

    it("deve converter monthlyLimit para string", async () => {
      (validateUserNotAuthenticated as jest.Mock).mockResolvedValue({
        id: mockUserId,
      });
      (BudgetRepository.create as jest.Mock).mockResolvedValue(
        mockCreatedBudget
      );

      await createBudgetService(mockUserId, {
        categoryId: "cat-123",
        monthlyLimit: 2500.75,
      });

      expect(BudgetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          monthlyLimit: "2500.75",
        })
      );
    });
  });

  describe("getUserBudgetsService", () => {
    const mockUserId = "user-123";

    it("deve retornar todos os orçamentos do usuário", async () => {
      const mockBudgetsWithCategory = [
        {
          id: "budget-1",
          userId: mockUserId,
          categoryId: "cat-1",
          monthlyLimit: "1000",
          category: { id: "cat-1", name: "Alimentação" },
        },
        {
          id: "budget-2",
          userId: mockUserId,
          categoryId: "cat-2",
          monthlyLimit: "500",
          category: { id: "cat-2", name: "Transporte" },
        },
      ];

      const mockUser = {
        id: mockUserId,
        financialDayStart: 1,
        financialDayEnd: 31,
      };

      (BudgetRepository.getBudgetWithCategory as jest.Mock).mockResolvedValue(
        mockBudgetsWithCategory
      );
      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (TransactionRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      const result = await getUserBudgetsService(mockUserId);

      expect(BudgetRepository.getBudgetWithCategory).toHaveBeenCalledWith(
        mockUserId
      );
      expect(UserRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("spent");
      expect(result[0]).toHaveProperty("remaining");
      expect(result[0]).toHaveProperty("percentage");
      expect(result[0]).toHaveProperty("status");
    });

    it("deve retornar array vazio quando usuário não tem orçamentos", async () => {
      const mockUser = {
        id: mockUserId,
        financialDayStart: 1,
        financialDayEnd: 31,
      };

      (BudgetRepository.getBudgetWithCategory as jest.Mock).mockResolvedValue(
        []
      );
      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserBudgetsService(mockUserId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("updateBudgetService", () => {
    const mockUserId = "user-123";
    const mockBudgetId = "budget-123";

    it("deve atualizar um orçamento com sucesso", async () => {
      const mockUpdatedBudget = {
        id: mockBudgetId,
        userId: mockUserId,
        categoryId: "cat-123",
        monthlyLimit: "1500",
      };

      (validateUserNotAuthenticated as jest.Mock).mockResolvedValue({
        id: mockUserId,
      });
      (BudgetRepository.update as jest.Mock).mockResolvedValue(
        mockUpdatedBudget
      );

      const result = await updateBudgetService(mockUserId, mockBudgetId, {
        monthlyLimit: 1500,
      });

      expect(validateUserNotAuthenticated).toHaveBeenCalledWith(mockUserId);
      expect(BudgetRepository.update).toHaveBeenCalledWith(mockBudgetId, {
        monthlyLimit: "1500",
      });
      expect(result).toEqual(mockUpdatedBudget);
    });
  });

  describe("deleteBudgetService", () => {
    const mockUserId = "user-123";
    const mockBudgetId = "budget-123";

    it("deve deletar um orçamento com sucesso", async () => {
      (validateUserNotAuthenticated as jest.Mock).mockResolvedValue({
        id: mockUserId,
      });
      (validateBudgetExists as jest.Mock).mockResolvedValue(undefined);
      (BudgetRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await deleteBudgetService(mockUserId, mockBudgetId);

      expect(validateUserNotAuthenticated).toHaveBeenCalledWith(mockUserId);
      expect(validateBudgetExists).toHaveBeenCalledWith(
        mockBudgetId,
        mockUserId
      );
      expect(BudgetRepository.delete).toHaveBeenCalledWith(mockBudgetId);
      expect(result).toBe(true);
    });
  });

  describe("getUserBudgets", () => {
    const mockUserId = "user-123";
    const mockUser = {
      id: mockUserId,
      financialDayStart: 1,
      financialDayEnd: 31,
    };

    const mockBudgets = [
      {
        id: "budget-1",
        userId: mockUserId,
        categoryId: "cat-1",
        monthlyLimit: "1000",
        category: { id: "cat-1", name: "Alimentação" },
      },
    ];

    const mockTransactions = [
      {
        id: "trans-1",
        type: "expense",
        amount: "250",
        category: { id: "cat-1" },
      },
      {
        id: "trans-2",
        type: "expense",
        amount: "150",
        category: { id: "cat-1" },
      },
    ];

    it("deve retornar orçamentos com progresso calculado", async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (BudgetRepository.getBudgetWithCategory as jest.Mock).mockResolvedValue(
        mockBudgets
      );
      (TransactionRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockTransactions
      );

      const result = await getUserBudgets(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "budget-1",
        spent: 400, // 250 + 150
        remaining: 600, // 1000 - 400
        percentage: 40, // (400 / 1000) * 100
        status: "safe",
      });
    });

    it("deve calcular status warning quando gasto é >= 90%", async () => {
      const highExpenseTransactions = [
        {
          id: "trans-1",
          type: "expense",
          amount: "950",
          category: { id: "cat-1" },
        },
      ];

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (BudgetRepository.getBudgetWithCategory as jest.Mock).mockResolvedValue(
        mockBudgets
      );
      (TransactionRepository.findByUserId as jest.Mock).mockResolvedValue(
        highExpenseTransactions
      );

      const result = await getUserBudgets(mockUserId);

      expect(result[0].status).toBe("warning");
      expect(result[0].percentage).toBe(95);
    });

    it("deve calcular status exceeded quando gasto é >= 100%", async () => {
      const exceededTransactions = [
        {
          id: "trans-1",
          type: "expense",
          amount: "1200",
          category: { id: "cat-1" },
        },
      ];

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (BudgetRepository.getBudgetWithCategory as jest.Mock).mockResolvedValue(
        mockBudgets
      );
      (TransactionRepository.findByUserId as jest.Mock).mockResolvedValue(
        exceededTransactions
      );

      const result = await getUserBudgets(mockUserId);

      expect(result[0].status).toBe("exceeded");
      expect(result[0].percentage).toBe(100); // Limitado a 100
      expect(result[0].remaining).toBe(0); // Não pode ser negativo
    });

    it("deve lançar erro quando usuário não é encontrado", async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(getUserBudgets(mockUserId)).rejects.toThrow(
        "Usuário não encontrado"
      );
    });

    it("deve lançar erro quando configuração de período não existe", async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue({
        id: mockUserId,
        financialDayStart: 0,
        financialDayEnd: 0,
      });

      await expect(getUserBudgets(mockUserId)).rejects.toThrow(
        "Configuração de período financeiro não encontrada. Por favor, configure seu período financeiro nas configurações."
      );
    });
  });

  describe("updateBudget", () => {
    const mockUserId = "user-123";
    const mockBudgetId = "budget-123";

    it("deve atualizar orçamento e verificar ownership", async () => {
      const mockUpdatedBudget = {
        id: mockBudgetId,
        userId: mockUserId,
        monthlyLimit: "2000",
      };

      (BudgetRepository.update as jest.Mock).mockResolvedValue(
        mockUpdatedBudget
      );

      const result = await updateBudget(mockUserId, mockBudgetId, {
        monthlyLimit: 2000,
      });

      expect(result).toEqual(mockUpdatedBudget);
    });

    it("deve lançar erro quando orçamento não é encontrado", async () => {
      (BudgetRepository.update as jest.Mock).mockResolvedValue(null);

      await expect(
        updateBudget(mockUserId, mockBudgetId, { monthlyLimit: 2000 })
      ).rejects.toThrow("Orçamento não encontrado");
    });

    it("deve lançar erro quando orçamento não pertence ao usuário", async () => {
      const mockBudgetFromOtherUser = {
        id: mockBudgetId,
        userId: "other-user-123",
        monthlyLimit: "2000",
      };

      (BudgetRepository.update as jest.Mock).mockResolvedValue(
        mockBudgetFromOtherUser
      );

      await expect(
        updateBudget(mockUserId, mockBudgetId, { monthlyLimit: 2000 })
      ).rejects.toThrow(
        "Você não tem permissão para modificar este orçamento."
      );
    });
  });

  describe("deleteBudget", () => {
    const mockUserId = "user-123";
    const mockBudgetId = "budget-123";

    it("deve deletar orçamento com sucesso", async () => {
      (BudgetRepository.findByIdAndUserId as jest.Mock).mockResolvedValue({
        id: mockBudgetId,
        userId: mockUserId,
      });
      (BudgetRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await deleteBudget(mockUserId, mockBudgetId);

      expect(result).toBe(true);
      expect(BudgetRepository.findByIdAndUserId).toHaveBeenCalledWith(
        mockBudgetId,
        mockUserId
      );
      expect(BudgetRepository.delete).toHaveBeenCalledWith(mockBudgetId);
    });

    it("deve lançar erro quando orçamento não é encontrado", async () => {
      (BudgetRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(null);

      await expect(deleteBudget(mockUserId, mockBudgetId)).rejects.toThrow(
        "Orçamento não encontrado. Verifique se o ID está correto e se você tem permissão para acessá-lo."
      );

      expect(BudgetRepository.delete).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando delete falha", async () => {
      (BudgetRepository.findByIdAndUserId as jest.Mock).mockResolvedValue({
        id: mockBudgetId,
        userId: mockUserId,
      });
      (BudgetRepository.delete as jest.Mock).mockResolvedValue(false);

      await expect(deleteBudget(mockUserId, mockBudgetId)).rejects.toThrow(
        "Não foi possível deletar o orçamento. Por favor, tente novamente."
      );
    });
  });

  describe("getBudgetStatus", () => {
    it("deve retornar 'safe' quando percentage < 75", () => {
      expect(getBudgetStatus(50)).toBe("safe");
      expect(getBudgetStatus(74.99)).toBe("safe");
      expect(getBudgetStatus(0)).toBe("safe");
    });

    it("deve retornar 'attention' quando percentage >= 75 e < 90", () => {
      expect(getBudgetStatus(75)).toBe("attention");
      expect(getBudgetStatus(80)).toBe("attention");
      expect(getBudgetStatus(89.99)).toBe("attention");
    });

    it("deve retornar 'warning' quando percentage >= 90 e < 100", () => {
      expect(getBudgetStatus(90)).toBe("warning");
      expect(getBudgetStatus(95)).toBe("warning");
      expect(getBudgetStatus(99.99)).toBe("warning");
    });

    it("deve retornar 'exceeded' quando percentage >= 100", () => {
      expect(getBudgetStatus(100)).toBe("exceeded");
      expect(getBudgetStatus(150)).toBe("exceeded");
    });
  });

  describe("getBudgetProgressService", () => {
    const mockUserId = "user-123";
    const mockUser = {
      id: mockUserId,
      financialDayStart: 1,
      financialDayEnd: 31,
    };

    it("deve retornar progresso de todos os orçamentos", async () => {
      const mockBudgets = [
        {
          id: "budget-1",
          userId: mockUserId,
          categoryId: "cat-1",
          monthlyLimit: "1000",
          category: { id: "cat-1", name: "Alimentação" },
        },
      ];

      const mockTransactions = [
        {
          id: "trans-1",
          type: "expense",
          amount: "300",
          category: { id: "cat-1" },
        },
      ];

      (validateUserNotAuthenticated as jest.Mock).mockResolvedValue(mockUser);
      (BudgetRepository.getBudgetWithCategory as jest.Mock).mockResolvedValue(
        mockBudgets
      );
      (TransactionRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockTransactions
      );

      const result = await getBudgetProgressService(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "budget-1",
        spent: 300,
        remaining: 700,
        percentage: 30,
        status: "safe",
      });
    });
  });
});
