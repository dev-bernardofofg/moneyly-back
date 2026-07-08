/**
 * Unit tests for the category service (factory with injected dependencies).
 */

import {
  makeCategoryService,
  type CategoryServiceDeps,
} from '../../../src/services/category.service';

const buildDeps = () => {
  const deps = {
    categoryRepository: {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdPaginated: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    validations: {
      validateCategoryExists: jest.fn(),
      validateCategoryExistsByUserId: jest.fn(),
      validateCategoryIsNotGlobal: jest.fn(),
      validateCategoryNameIsNotInUse: jest.fn(),
      validateHideGlobalCategory: jest.fn(),
    },
    validatePagination: jest.fn(),
  };
  return deps as unknown as CategoryServiceDeps & typeof deps;
};

describe('category service', () => {
  describe('create', () => {
    const userId = 'user-123';
    const categoryName = 'Alimentação';

    const created = {
      id: 'cat-123',
      name: categoryName,
      userId,
      icon: null,
      color: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates a category successfully', async () => {
      const deps = buildDeps();
      deps.validations.validateCategoryExists.mockResolvedValue(undefined);
      deps.categoryRepository.create.mockResolvedValue(created);

      const service = makeCategoryService(deps);
      const result = await service.create(categoryName, userId);

      expect(deps.validations.validateCategoryExists).toHaveBeenCalledWith(categoryName);
      expect(deps.categoryRepository.create).toHaveBeenCalledWith({
        name: categoryName,
        userId,
      });
      expect(result).toEqual(created);
    });

    it('validates whether the category already exists before creating', async () => {
      const deps = buildDeps();
      deps.validations.validateCategoryExists.mockRejectedValue(new Error('Categoria já existe'));

      const service = makeCategoryService(deps);

      await expect(service.create(categoryName, userId)).rejects.toThrow('Categoria já existe');
      expect(deps.categoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getPaginated', () => {
    const userId = 'user-123';
    const categories = [
      { id: 'cat-1', name: 'Alimentação', userId },
      { id: 'cat-2', name: 'Transporte', userId },
      { id: 'cat-3', name: 'Lazer', userId },
    ];

    it('returns categories with pagination', async () => {
      const deps = buildDeps();
      const pagination = { page: 1, limit: 10 };
      const paginatedResult = {
        data: categories,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1, hasNext: false, hasPrev: false },
      };
      deps.validatePagination.mockResolvedValue(pagination);
      deps.categoryRepository.findByUserIdPaginated.mockResolvedValue(paginatedResult);

      const service = makeCategoryService(deps);
      const result = await service.getPaginated(userId, pagination);

      expect(deps.validatePagination).toHaveBeenCalledWith(1, 10);
      expect(deps.categoryRepository.findByUserIdPaginated).toHaveBeenCalledWith(
        userId,
        pagination
      );
      expect(result).toEqual(paginatedResult);
    });

    it('returns all categories without pagination when not specified', async () => {
      const deps = buildDeps();
      deps.validatePagination.mockResolvedValue(null);
      deps.categoryRepository.findByUserId.mockResolvedValue(categories);

      const service = makeCategoryService(deps);
      const result = await service.getPaginated(userId, {});

      expect(deps.categoryRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        data: categories,
        pagination: { page: 1, limit: 3, total: 3, totalPages: 1, hasNext: false, hasPrev: false },
      });
    });

    it('returns an empty structure when the user has no categories', async () => {
      const deps = buildDeps();
      deps.validatePagination.mockResolvedValue(null);
      deps.categoryRepository.findByUserId.mockResolvedValue([]);

      const service = makeCategoryService(deps);
      const result = await service.getPaginated(userId, {});

      expect(result).toEqual({
        data: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
      });
    });

    it('handles multi-page pagination', async () => {
      const deps = buildDeps();
      const pagination = { page: 2, limit: 10 };
      const paginatedResult = {
        data: categories.slice(0, 2),
        pagination: { page: 2, limit: 10, total: 25, totalPages: 3, hasNext: true, hasPrev: true },
      };
      deps.validatePagination.mockResolvedValue(pagination);
      deps.categoryRepository.findByUserIdPaginated.mockResolvedValue(paginatedResult);

      const service = makeCategoryService(deps);
      const result = await service.getPaginated(userId, pagination);

      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.page).toBe(2);
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const categoryId = 'cat-123';
    const newName = 'Alimentação Atualizada';

    const updated = {
      id: categoryId,
      name: newName,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('updates a category successfully', async () => {
      const deps = buildDeps();
      deps.categoryRepository.update.mockResolvedValue(updated);

      const service = makeCategoryService(deps);
      const result = await service.update(categoryId, newName, userId);

      expect(deps.validations.validateCategoryExistsByUserId).toHaveBeenCalledWith(
        categoryId,
        userId
      );
      expect(deps.validations.validateCategoryExists).toHaveBeenCalledWith(newName);
      expect(deps.validations.validateCategoryIsNotGlobal).toHaveBeenCalledWith(categoryId, userId);
      expect(deps.validations.validateCategoryNameIsNotInUse).toHaveBeenCalledWith(newName, userId);
      expect(deps.categoryRepository.update).toHaveBeenCalledWith(categoryId, {
        name: newName,
        userId,
      });
      expect(result).toEqual(updated);
    });

    it('throws an error when the category does not exist', async () => {
      const deps = buildDeps();
      deps.validations.validateCategoryExistsByUserId.mockRejectedValue(
        new Error('Categoria não encontrada')
      );

      const service = makeCategoryService(deps);

      await expect(service.update(categoryId, newName, userId)).rejects.toThrow(
        'Categoria não encontrada'
      );
      expect(deps.categoryRepository.update).not.toHaveBeenCalled();
    });

    it('throws an error when trying to update a global category', async () => {
      const deps = buildDeps();
      deps.validations.validateCategoryIsNotGlobal.mockRejectedValue(
        new Error('Não é possível atualizar categoria global')
      );

      const service = makeCategoryService(deps);

      await expect(service.update(categoryId, newName, userId)).rejects.toThrow(
        'Não é possível atualizar categoria global'
      );
      expect(deps.categoryRepository.update).not.toHaveBeenCalled();
    });

    it('throws an error when the new name is already in use', async () => {
      const deps = buildDeps();
      deps.validations.validateCategoryNameIsNotInUse.mockRejectedValue(
        new Error('Nome já está em uso')
      );

      const service = makeCategoryService(deps);

      await expect(service.update(categoryId, newName, userId)).rejects.toThrow(
        'Nome já está em uso'
      );
      expect(deps.categoryRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const userId = 'user-123';
    const categoryId = 'cat-123';

    it('deletes a category successfully', async () => {
      const deps = buildDeps();
      deps.categoryRepository.delete.mockResolvedValue(true);

      const service = makeCategoryService(deps);
      const result = await service.delete(categoryId, userId);

      expect(deps.validations.validateCategoryExistsByUserId).toHaveBeenCalledWith(
        categoryId,
        userId
      );
      expect(deps.validations.validateHideGlobalCategory).toHaveBeenCalledWith(categoryId, userId);
      expect(deps.categoryRepository.delete).toHaveBeenCalledWith(categoryId, userId);
      expect(result).toBe(true);
    });

    it('throws an error when the category does not exist', async () => {
      const deps = buildDeps();
      deps.validations.validateCategoryExistsByUserId.mockRejectedValue(
        new Error('Categoria não encontrada')
      );

      const service = makeCategoryService(deps);

      await expect(service.delete(categoryId, userId)).rejects.toThrow('Categoria não encontrada');
      expect(deps.categoryRepository.delete).not.toHaveBeenCalled();
    });

    it('throws an error when trying to delete a global category', async () => {
      const deps = buildDeps();
      deps.validations.validateHideGlobalCategory.mockRejectedValue(
        new Error('Não é possível deletar categoria global')
      );

      const service = makeCategoryService(deps);

      await expect(service.delete(categoryId, userId)).rejects.toThrow(
        'Não é possível deletar categoria global'
      );
      expect(deps.categoryRepository.delete).not.toHaveBeenCalled();
    });

    it('allows only hiding a global category', async () => {
      const deps = buildDeps();
      const globalCategoryId = 'global-cat-123';
      deps.categoryRepository.delete.mockResolvedValue(true);

      const service = makeCategoryService(deps);
      const result = await service.delete(globalCategoryId, userId);

      expect(deps.validations.validateHideGlobalCategory).toHaveBeenCalledWith(
        globalCategoryId,
        userId
      );
      expect(result).toBe(true);
    });
  });
});
