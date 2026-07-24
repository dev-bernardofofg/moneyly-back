import { categoryRepository } from '../repositories/category.repository';
import {
  validateCategoryExists,
  validateCategoryExistsByUserId,
  validateCategoryIsNotGlobal,
  validateCategoryNameIsNotInUse,
} from '../validations/category.validation';

export const updateCategoryUseCase = async (id: string, name: string, userId: string) => {
  await validateCategoryExistsByUserId(id, userId);
  await validateCategoryExists(name);
  await validateCategoryIsNotGlobal(id, userId);
  await validateCategoryNameIsNotInUse(name, userId);
  const category = await categoryRepository.update(id, { name, userId });
  return category;
};
