import { CategoryRepository } from "../repositories/categories.repository";
import {
  validateCategoryExists,
  validateCategoryExistsByUserId,
  validateCategoryIsNotGlobal,
  validateCategoryNameIsNotInUse,
  validateHideGlobalCategory,
} from "../validations/category.validation";
import { validatePagination } from "../validations/pagination.validation";

export const createCategoryService = async (name: string, userId: string) => {
  await validateCategoryExists(name);
  const category = await CategoryRepository.create({ name, userId });
  return category;
};

export const getCategoriesService = async (
  userId: string,
  pagination: { page?: number; limit?: number }
) => {
  const paginationExists = await validatePagination(
    pagination.page || 0,
    pagination.limit || 0
  );

  if (paginationExists) {
    const result = await CategoryRepository.findByUserIdPaginated(
      userId,
      paginationExists
    );
    return result;
  } else {
    const categories = await CategoryRepository.findByUserId(userId);
    // Retornar estrutura consistente mesmo sem paginação
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
  }
};

export const updateCategoryService = async (
  id: string,
  name: string,
  userId: string
) => {
  await validateCategoryExistsByUserId(id, userId);
  await validateCategoryExists(name);
  await validateCategoryIsNotGlobal(id, userId);
  await validateCategoryNameIsNotInUse(name, userId);
  const category = await CategoryRepository.update(id, { name, userId });
  return category;
};

export const deleteCategoryService = async (id: string, userId: string) => {
  await validateCategoryExistsByUserId(id, userId);
  await validateHideGlobalCategory(id, userId);
  const category = await CategoryRepository.delete(id, userId);
  return category;
};
