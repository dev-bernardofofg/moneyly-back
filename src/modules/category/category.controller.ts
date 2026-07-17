import { ResponseHandler } from '../../core/helpers/response-handler';
import { asyncHandler } from '../../core/middlewares/async-handler';
import type { AuthRequest } from '../auth/middlewares/auth';
import { BadRequestError } from '../../core/errors';
import { createCategoryUseCase } from './use-cases/create-category.use-case';
import { deleteCategoryUseCase } from './use-cases/delete-category.use-case';
import { listCategoriesUseCase } from './use-cases/list-categories.use-case';
import { updateCategoryUseCase } from './use-cases/update-category.use-case';

export const createCategory = asyncHandler<AuthRequest>(async (req, res) => {
  const { name } = req.body;
  const category = await createCategoryUseCase(name, req.user.id);
  return ResponseHandler.success(res, category, 'Categoria criada com sucesso');
});

export const getCategories = asyncHandler<AuthRequest>(async (req, res) => {
  const { page, limit } = req.query as { page?: number; limit?: number };
  const result = await listCategoriesUseCase(req.user.id, { page, limit });
  return ResponseHandler.paginated(
    res,
    result.data,
    {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.totalPages,
      hasNext: result.pagination.hasNext,
      hasPrev: result.pagination.hasPrev,
    },
    'Categorias recuperadas com sucesso'
  );
});

export const updateCategory = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da categoria não fornecido');

  const { name } = req.body;
  const category = await updateCategoryUseCase(id, name, req.user.id);
  return ResponseHandler.success(res, category, 'Categoria atualizada com sucesso');
});

export const deleteCategory = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da categoria não fornecido');

  await deleteCategoryUseCase(id, req.user.id);
  return ResponseHandler.success(res, null, 'Categoria deletada com sucesso');
});
