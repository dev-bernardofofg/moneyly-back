/**
 * Unit tests for the transaction service (factory with injected dependencies).
 */

import {
  makeTransactionService,
  type TransactionServiceDeps,
} from '../../../src/services/transaction.service';

const buildDeps = () => {
  const deps = {
    transactionRepository: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdPaginated: jest.fn(),
      findAllByUserId: jest.fn(),
    },
    userRepository: {
      findById: jest.fn(),
    },
    financialPeriodService: {
      findOrCreatePeriodForDate: jest.fn().mockResolvedValue('p1'),
    },
    validateCategory: jest.fn(),
  };
  return deps as unknown as TransactionServiceDeps & typeof deps;
};

describe('transaction service', () => {
  describe('create', () => {
    const userId = 'user-123';
    const transactionData = {
      type: 'expense' as const,
      title: 'Almoço',
      amount: '45.50',
      category: 'cat-123',
      description: 'Restaurante X',
      date: new Date('2024-01-15'),
    };

    const created = {
      id: 'trans-123',
      userId,
      type: 'expense',
      title: 'Almoço',
      amount: '45.50',
      categoryId: 'cat-123',
      description: 'Restaurante X',
      date: new Date('2024-01-15'),
      periodId: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates a transaction successfully', async () => {
      const deps = buildDeps();
      deps.validateCategory.mockResolvedValue(undefined);
      deps.transactionRepository.create.mockResolvedValue(created);

      const service = makeTransactionService(deps);
      const result = await service.create(userId, transactionData);

      expect(deps.validateCategory).toHaveBeenCalledWith(transactionData.category, userId);
      expect(deps.transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: transactionData.type,
          title: transactionData.title,
          amount: transactionData.amount,
          categoryId: transactionData.category,
          description: transactionData.description,
          periodId: 'p1',
        })
      );
      expect(result).toEqual(created);
    });

    it('creates a transaction with the current date when no date is provided', async () => {
      const deps = buildDeps();
      deps.validateCategory.mockResolvedValue(undefined);
      deps.transactionRepository.create.mockResolvedValue(created);

      const dataWithoutDate = { ...transactionData };
      delete (dataWithoutDate as Partial<typeof transactionData>).date;

      const service = makeTransactionService(deps);
      await service.create(userId, dataWithoutDate as typeof transactionData);

      expect(deps.transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, date: expect.any(Date) })
      );
    });

    it('throws when the category does not exist and does not create', async () => {
      const deps = buildDeps();
      deps.validateCategory.mockRejectedValue(new Error('Categoria não encontrada'));

      const service = makeTransactionService(deps);

      await expect(service.create(userId, transactionData)).rejects.toThrow(
        'Categoria não encontrada'
      );
      expect(deps.transactionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const id = 'trans-123';
    const userId = 'user-123';

    const updated = {
      id,
      userId,
      type: 'expense' as const,
      title: 'Jantar Atualizado',
      amount: '80.00',
      categoryId: 'cat-456',
      description: 'Restaurante Y',
      date: new Date('2024-01-20'),
      periodId: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('updates a transaction successfully', async () => {
      const deps = buildDeps();
      const updateData = { title: 'Jantar Atualizado', amount: '80.00', categoryId: 'cat-456' };
      deps.validateCategory.mockResolvedValue(undefined);
      deps.transactionRepository.update.mockResolvedValue(updated);

      const service = makeTransactionService(deps);
      const result = await service.update(id, userId, updateData);

      expect(deps.validateCategory).toHaveBeenCalledWith(updateData.categoryId, userId);
      expect(deps.transactionRepository.update).toHaveBeenCalledWith(id, userId, updateData);
      expect(result).toEqual(updated);
    });

    it('does not validate the category when it is unchanged', async () => {
      const deps = buildDeps();
      const updateData = { title: 'Título Atualizado', amount: '100.00' };
      deps.transactionRepository.update.mockResolvedValue(updated);

      const service = makeTransactionService(deps);
      await service.update(id, userId, updateData);

      expect(deps.validateCategory).not.toHaveBeenCalled();
      expect(deps.transactionRepository.update).toHaveBeenCalledWith(id, userId, updateData);
    });

    it('throws when the transaction is not found', async () => {
      const deps = buildDeps();
      deps.transactionRepository.update.mockResolvedValue(null);

      const service = makeTransactionService(deps);

      await expect(service.update(id, userId, { title: 'Novo Título' })).rejects.toThrow(
        'Transação não encontrada'
      );
    });

    it('throws when the new category does not exist and does not update', async () => {
      const deps = buildDeps();
      deps.validateCategory.mockRejectedValue(new Error('Categoria não encontrada'));

      const service = makeTransactionService(deps);

      await expect(service.update(id, userId, { categoryId: 'cat-invalid' })).rejects.toThrow(
        'Categoria não encontrada'
      );
      expect(deps.transactionRepository.update).not.toHaveBeenCalled();
    });

    it('applies timezone and resolves the period when the date is updated', async () => {
      const deps = buildDeps();
      deps.transactionRepository.update.mockResolvedValue(updated);

      const service = makeTransactionService(deps);
      await service.update(id, userId, { date: new Date('2024-02-01T10:00:00Z') });

      expect(deps.financialPeriodService.findOrCreatePeriodForDate).toHaveBeenCalled();
      expect(deps.transactionRepository.update).toHaveBeenCalledWith(
        id,
        userId,
        expect.objectContaining({ date: expect.any(Date), periodId: 'p1' })
      );
    });
  });

  describe('delete', () => {
    it('throws when the transaction to delete is not found', async () => {
      const deps = buildDeps();
      deps.transactionRepository.delete.mockResolvedValue(null);

      const service = makeTransactionService(deps);

      await expect(service.delete('trans-x', 'user-123')).rejects.toThrow(
        'Transação não encontrada'
      );
    });
  });
});
