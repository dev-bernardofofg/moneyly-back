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
    const categories = await CategoryRepository.findByUserIdPaginated(
      userId,
      paginationExists
    );
    return categories;
  } else {
    const categories = await CategoryRepository.findByUserId(userId);
    return categories;
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
  await validateCategoryIsNotGlobal(id, userId);
  await validateHideGlobalCategory(id, userId);
  const category = await CategoryRepository.delete(id, userId);
  return category;
};
