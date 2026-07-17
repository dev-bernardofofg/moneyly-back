import { validatePagination } from '../../../core/validations/pagination.validation';
import { categoryRepository } from '../repositories/category.repository';

export const listCategoriesUseCase = async (
  userId: string,
  pagination: { page?: number; limit?: number }
) => {
  const paginationExists = await validatePagination(pagination.page, pagination.limit);

  if (paginationExists) {
    const result = await categoryRepository.findByUserIdPaginated(userId, paginationExists);
    return result;
  } else {
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
  }
};
