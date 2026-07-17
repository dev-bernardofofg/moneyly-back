/**
 * Testes unitários para TransactionService
 */

import { transactionRepository } from '../../../../src/modules/transaction/repositories/transaction.repository';
import { createTransactionUseCase } from '../../../../src/modules/transaction/use-cases/create-transaction.use-case';
import { updateTransactionUseCase } from '../../../../src/modules/transaction/use-cases/update-transaction.use-case';
import { validateCategoryExistsForUser } from '../../../../src/modules/transaction/validations/transaction.validation';

// Mock dos módulos
jest.mock('../../../../src/modules/transaction/repositories/transaction.repository');
jest.mock('../../../../src/modules/transaction/validations/transaction.validation');
jest.mock('../../../../src/modules/financial-period', () => ({
  ensurePeriodExists: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  financialPeriodService: {
    findOrCreatePeriodForDate: jest.fn().mockResolvedValue('p1'),
    ensureCurrentPeriodExists: jest.fn().mockResolvedValue({ id: 'p1' }),
  },
}));

describe('TransactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransactionService', () => {
    const mockUserId = 'user-123';
    const mockTransactionData = {
      type: 'expense' as const,
      title: 'Almoço',
      amount: '45.50',
      category: 'cat-123',
      description: 'Restaurante X',
      date: new Date('2024-01-15'),
    };

    const mockCreatedTransaction = {
      id: 'trans-123',
      userId: mockUserId,
      type: 'expense',
      title: 'Almoço',
      amount: '45.50',
      categoryId: 'cat-123',
      description: 'Restaurante X',
      date: new Date('2024-01-15'),
      periodId: 'period-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates a transaction successfully', async () => {
      (validateCategoryExistsForUser as jest.Mock).mockResolvedValue(undefined);
      (transactionRepository.create as jest.Mock).mockResolvedValue(mockCreatedTransaction);

      const result = await createTransactionUseCase(mockUserId, mockTransactionData);

      expect(validateCategoryExistsForUser).toHaveBeenCalledWith(
        mockTransactionData.category,
        mockUserId
      );
      expect(transactionRepository.create).toHaveBeenCalledWith(
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

    it('creates a transaction with the current date when no date is provided', async () => {
      const dataWithoutDate = { ...mockTransactionData };
      delete (dataWithoutDate as Partial<typeof mockTransactionData>).date;

      (validateCategoryExistsForUser as jest.Mock).mockResolvedValue(undefined);
      (transactionRepository.create as jest.Mock).mockResolvedValue(mockCreatedTransaction);

      await createTransactionUseCase(mockUserId, dataWithoutDate as any);

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          date: expect.any(Date),
        })
      );
    });

    it('throws an error when the category does not exist', async () => {
      (validateCategoryExistsForUser as jest.Mock).mockRejectedValue(
        new Error('Categoria não encontrada')
      );

      await expect(createTransactionUseCase(mockUserId, mockTransactionData)).rejects.toThrow(
        'Categoria não encontrada'
      );

      expect(transactionRepository.create).not.toHaveBeenCalled();
    });

    it('throws an error when the category does not belong to the user', async () => {
      (validateCategoryExistsForUser as jest.Mock).mockRejectedValue(
        new Error('Categoria não pertence ao usuário')
      );

      await expect(createTransactionUseCase(mockUserId, mockTransactionData)).rejects.toThrow(
        'Categoria não pertence ao usuário'
      );

      expect(transactionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTransactionService', () => {
    const mockTransactionId = 'trans-123';
    const mockUserId = 'user-123';

    const mockUpdatedTransaction = {
      id: mockTransactionId,
      userId: mockUserId,
      type: 'expense' as const,
      title: 'Jantar Atualizado',
      amount: '80.00',
      categoryId: 'cat-456',
      description: 'Restaurante Y',
      date: new Date('2024-01-20'),
      periodId: 'period-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('updates a transaction successfully', async () => {
      const updateData = {
        title: 'Jantar Atualizado',
        amount: '80.00',
        categoryId: 'cat-456',
      };

      (validateCategoryExistsForUser as jest.Mock).mockResolvedValue(undefined);
      (transactionRepository.update as jest.Mock).mockResolvedValue(mockUpdatedTransaction);

      const result = await updateTransactionUseCase(mockTransactionId, mockUserId, updateData);

      expect(validateCategoryExistsForUser).toHaveBeenCalledWith(updateData.categoryId, mockUserId);
      expect(transactionRepository.update).toHaveBeenCalledWith(
        mockTransactionId,
        mockUserId,
        updateData
      );
      expect(result).toEqual(mockUpdatedTransaction);
    });

    it('updates a transaction without validating the category when it is unchanged', async () => {
      const updateData = {
        title: 'Título Atualizado',
        amount: '100.00',
      };

      (transactionRepository.update as jest.Mock).mockResolvedValue(mockUpdatedTransaction);

      await updateTransactionUseCase(mockTransactionId, mockUserId, updateData);

      expect(validateCategoryExistsForUser).not.toHaveBeenCalled();
      expect(transactionRepository.update).toHaveBeenCalledWith(
        mockTransactionId,
        mockUserId,
        updateData
      );
    });

    it('throws an error when the transaction is not found', async () => {
      (transactionRepository.update as jest.Mock).mockResolvedValue(null);

      await expect(
        updateTransactionUseCase(mockTransactionId, mockUserId, {
          title: 'Novo Título',
        })
      ).rejects.toThrow('Transação não encontrada');
    });

    it('throws an error when the new category does not exist', async () => {
      (validateCategoryExistsForUser as jest.Mock).mockRejectedValue(
        new Error('Categoria não encontrada')
      );

      await expect(
        updateTransactionUseCase(mockTransactionId, mockUserId, {
          categoryId: 'cat-invalid',
        })
      ).rejects.toThrow('Categoria não encontrada');

      expect(transactionRepository.update).not.toHaveBeenCalled();
    });

    it('applies timezone when the date is updated', async () => {
      const updateData = {
        date: new Date('2024-02-01T10:00:00Z'),
      };

      (transactionRepository.update as jest.Mock).mockResolvedValue(mockUpdatedTransaction);

      await updateTransactionUseCase(mockTransactionId, mockUserId, updateData);

      expect(transactionRepository.update).toHaveBeenCalledWith(
        mockTransactionId,
        mockUserId,
        expect.objectContaining({
          date: expect.any(Date),
        })
      );
    });
  });
});
