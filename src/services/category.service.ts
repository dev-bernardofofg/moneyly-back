import { categoryRepository } from '../repositories/categories.repository';
import type { ICategoryRepository } from '../repositories/interfaces/ICategoryRepository';
import {
  validateCategoryExists,
  validateCategoryExistsByUserId,
  validateCategoryIsNotGlobal,
  validateCategoryNameIsNotInUse,
  validateHideGlobalCategory,
} from '../validations/category.validation';
import { validatePagination } from '../validations/pagination.validation';

export interface CategoryServiceDeps {
  categoryRepository: Pick<
    ICategoryRepository,
    'create' | 'findByUserId' | 'findByUserIdPaginated' | 'update' | 'delete'
  >;
  validations: {
    validateCategoryExists: typeof validateCategoryExists;
    validateCategoryExistsByUserId: typeof validateCategoryExistsByUserId;
    validateCategoryIsNotGlobal: typeof validateCategoryIsNotGlobal;
    validateCategoryNameIsNotInUse: typeof validateCategoryNameIsNotInUse;
    validateHideGlobalCategory: typeof validateHideGlobalCategory;
  };
  validatePagination: typeof validatePagination;
}

export const makeCategoryService = (deps: CategoryServiceDeps) => {
  const { categoryRepository, validations, validatePagination } = deps;

  const create = async (name: string, userId: string) => {
    await validations.validateCategoryExists(name);
    return categoryRepository.create({ name, userId });
  };

  const getPaginated = async (userId: string, pagination: { page?: number; limit?: number }) => {
    const paginationExists = await validatePagination(pagination.page, pagination.limit);

    if (paginationExists) {
      return categoryRepository.findByUserIdPaginated(userId, paginationExists);
    }

    const categories = await categoryRepository.findByUserId(userId);
    return {
      data: categories,
      pagination: {
        page: 1,
        limit: categories.length,
        total: categories.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  };

  const update = async (id: string, name: string, userId: string) => {
    await validations.validateCategoryExistsByUserId(id, userId);
    await validations.validateCategoryExists(name);
    await validations.validateCategoryIsNotGlobal(id, userId);
    await validations.validateCategoryNameIsNotInUse(name, userId);
    return categoryRepository.update(id, { name, userId });
  };

  const remove = async (id: string, userId: string) => {
    await validations.validateCategoryExistsByUserId(id, userId);
    await validations.validateHideGlobalCategory(id, userId);
    return categoryRepository.delete(id, userId);
  };

  return { create, getPaginated, update, delete: remove };
};

// Composition root: instância default com os singletons reais.
export const categoryService = makeCategoryService({
  categoryRepository,
  validations: {
    validateCategoryExists,
    validateCategoryExistsByUserId,
    validateCategoryIsNotGlobal,
    validateCategoryNameIsNotInUse,
    validateHideGlobalCategory,
  },
  validatePagination,
});
