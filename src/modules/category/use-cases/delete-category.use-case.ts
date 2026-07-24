import { categoryRepository } from '../repositories/category.repository';
import {
  validateCategoryExistsByUserId,
  validateHideGlobalCategory,
} from '../validations/category.validation';

export const deleteCategoryUseCase = async (id: string, userId: string) => {
  await validateCategoryExistsByUserId(id, userId);
  await validateHideGlobalCategory(id, userId);
  const category = await categoryRepository.delete(id, userId);
  return category;
};
