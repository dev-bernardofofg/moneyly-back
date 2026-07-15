import { categoryRepository } from '../repositories/category.repository';
import { validateCategoryExists } from '../validations/category.validation';

export const createCategoryUseCase = async (name: string, userId: string) => {
  await validateCategoryExists(name);
  const category = await categoryRepository.create({ name, userId });
  return category;
};
