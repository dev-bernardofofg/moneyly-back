/**
 * Testes unitários para TransactionService
 */

import { TransactionRepository } from "../../../src/repositories/transaction.repository";
import {
  createTransactionService,
  updateTransactionService,
} from "../../../src/services/transaction.service";
import { validateCategoryExistsForUser } from "../../../src/validations/transaction.validation";

// Mock dos módulos
jest.mock("../../../src/repositories/transaction.repository");
jest.mock("../../../src/validations/transaction.validation");

describe("TransactionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createTransactionService", () => {
    const mockUserId = "user-123";
    const mockTransactionData = {
      type: "expense" as const,
      title: "Almoço",
      amount: "45.50",
      category: "cat-123",
      description: "Restaurante X",
      date: new Date("2024-01-15"),
    };

    const mockCreatedTransaction = {
      id: "trans-123",
      userId: mockUserId,
      type: "expense",
      title: "Almoço",
      amount: "45.50",
      categoryId: "cat-123",
      description: "Restaurante X",
      date: new Date("2024-01-15"),
      periodId: "period-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("deve criar uma transação com sucesso", async () => {
      (validateCategoryExistsForUser as jest.Mock).mockResolvedValue(undefined);
      (TransactionRepository.create as jest.Mock).mockResolvedValue(
        mockCreatedTransaction
      );

      const result = await createTransactionService(
        mockUserId,
        mockTransactionData
      );

      expect(validateCategoryExistsForUser).toHaveBeenCalledWith(
        mockTransactionData.category,
        mockUserId
      );
      expect(TransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          type: mockTransactionData.type,
          title: mockTransactionData.title,
          amount: mockTransactionData.amount,
          categoryId: mockTransactionData.category,
          description: mockTransactionData.description,
        })
      );
      expect(result).toEqual(mockCreatedTransaction);
    });

    it("deve criar transação com data atual quando data não é fornecida", async () => {
      const dataWithoutDate = { ...mockTransactionData };
      delete (dataWithoutDate as Partial<typeof mockTransactionData>).date;

      (validateCategoryExistsForUser as jest.Mock).mockResolvedValue(undefined);
      (TransactionRepository.create as jest.Mock).mockResolvedValue(
        mockCreatedTransaction
      );

      await createTransactionService(mockUserId, dataWithoutDate as any);

      expect(TransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          date: expect.any(Date),
        })
      );
    });

    it("deve lançar erro quando categoria não existe", async () => {
      (validateCategoryExistsForUser as jest.Mock).mockRejectedValue(
        new Error("Categoria não encontrada")
      );

      await expect(
        createTransactionService(mockUserId, mockTransactionData)
      ).rejects.toThrow("Categoria não encontrada");

      expect(TransactionRepository.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando categoria não pertence ao usuário", async () => {
      (validateCategoryExistsForUser as jest.Mock).mockRejectedValue(
        new Error("Categoria não pertence ao usuário")
      );

      await expect(
        createTransactionService(mockUserId, mockTransactionData)
      ).rejects.toThrow("Categoria não pertence ao usuário");

      expect(TransactionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updateTransactionService", () => {
    const mockTransactionId = "trans-123";
    const mockUserId = "user-123";

    const mockUpdatedTransaction = {
      id: mockTransactionId,
      userId: mockUserId,
      type: "expense" as const,
      title: "Jantar Atualizado",
      amount: "80.00",
      categoryId: "cat-456",
      description: "Restaurante Y",
      date: new Date("2024-01-20"),
      periodId: "period-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("deve atualizar uma transação com sucesso", async () => {
      const updateData = {
        title: "Jantar Atualizado",
        amount: "80.00",
        categoryId: "cat-456",
      };

      (validateCategoryExistsForUser as jest.Mock).mockResolvedValue(undefined);
      (TransactionRepository.update as jest.Mock).mockResolvedValue(
        mockUpdatedTransaction
      );

      const result = await updateTransactionService(
        mockTransactionId,
        mockUserId,
        updateData
      );

      expect(validateCategoryExistsForUser).toHaveBeenCalledWith(
        updateData.categoryId,
        mockUserId
      );
      expect(TransactionRepository.update).toHaveBeenCalledWith(
        mockTransactionId,
        mockUserId,
        updateData
      );
      expect(result).toEqual(mockUpdatedTransaction);
    });

    it("deve atualizar transação sem validar categoria quando categoria não é alterada", async () => {
      const updateData = {
        title: "Título Atualizado",
        amount: "100.00",
      };

      (TransactionRepository.update as jest.Mock).mockResolvedValue(
        mockUpdatedTransaction
      );

      await updateTransactionService(mockTransactionId, mockUserId, updateData);

      expect(validateCategoryExistsForUser).not.toHaveBeenCalled();
      expect(TransactionRepository.update).toHaveBeenCalledWith(
        mockTransactionId,
        mockUserId,
        updateData
      );
    });

    it("deve lançar erro quando transação não é encontrada", async () => {
      (TransactionRepository.update as jest.Mock).mockResolvedValue(null);

      await expect(
        updateTransactionService(mockTransactionId, mockUserId, {
          title: "Novo Título",
        })
      ).rejects.toThrow("Transação não encontrada");
    });

    it("deve lançar erro quando nova categoria não existe", async () => {
      (validateCategoryExistsForUser as jest.Mock).mockRejectedValue(
        new Error("Categoria não encontrada")
      );

      await expect(
        updateTransactionService(mockTransactionId, mockUserId, {
          categoryId: "cat-invalid",
        })
      ).rejects.toThrow("Categoria não encontrada");

      expect(TransactionRepository.update).not.toHaveBeenCalled();
    });

    it("deve aplicar timezone quando data é atualizada", async () => {
      const updateData = {
        date: new Date("2024-02-01T10:00:00Z"),
      };

      (TransactionRepository.update as jest.Mock).mockResolvedValue(
        mockUpdatedTransaction
      );

      await updateTransactionService(mockTransactionId, mockUserId, updateData);

      expect(TransactionRepository.update).toHaveBeenCalledWith(
        mockTransactionId,
        mockUserId,
        expect.objectContaining({
          date: expect.any(Date),
        })
      );
    });
  });
});


