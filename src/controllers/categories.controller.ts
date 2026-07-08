import { ResponseHandler } from '../helpers/response-handler';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import { BadRequestError } from '../services/errors';
import { categoryService } from '../services/category.service';

export const createCategory = asyncHandler<AuthRequest>(async (req, res) => {
  const { name } = req.body;
  const category = await categoryService.create(name, req.user.id);
  return ResponseHandler.success(res, category, 'Categoria criada com sucesso');
});

export const getCategories = asyncHandler<AuthRequest>(async (req, res) => {
  const { page, limit } = req.query as { page?: number; limit?: number };
  const result = await categoryService.getPaginated(req.user.id, { page, limit });
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
  const category = await categoryService.update(id, name, req.user.id);
  return ResponseHandler.success(res, category, 'Categoria atualizada com sucesso');
});

export const deleteCategory = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da categoria não fornecido');

  await categoryService.delete(id, req.user.id);
  return ResponseHandler.success(res, null, 'Categoria deletada com sucesso');
});
