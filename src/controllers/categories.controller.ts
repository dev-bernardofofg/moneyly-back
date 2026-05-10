import type { NextFunction, Response } from "express";
import { isHttpError } from "../helpers/errors";
import { ResponseHandler } from "../helpers/response-handler";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  createCategoryService,
  deleteCategoryService,
  getCategoriesService,
  updateCategoryService,
} from "../services/category.service";

export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const { name } = req.body;
    const category = await createCategoryService(name, req.user.id);
    return ResponseHandler.success(res, category, "Categoria criada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível criar a categoria. Verifique se o nome não está duplicado e tente novamente.",
      error
    );
  }
};

export const getCategories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const { page, limit } = req.query as { page?: number; limit?: number };
    const result = await getCategoriesService(req.user.id, { page, limit });
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
      "Categorias recuperadas com sucesso"
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível buscar as categorias. Por favor, tente novamente.",
      error
    );
  }
};

export const updateCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, "ID da categoria não fornecido");

  try {
    const { name } = req.body;
    const category = await updateCategoryService(id, name, req.user.id);
    return ResponseHandler.success(res, category, "Categoria atualizada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível atualizar a categoria. Verifique se o novo nome não está em uso e tente novamente.",
      error
    );
  }
};

export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, "ID da categoria não fornecido");

  try {
    await deleteCategoryService(id, req.user.id);
    return ResponseHandler.success(res, null, "Categoria deletada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível deletar a categoria. Categorias globais não podem ser deletadas.",
      error
    );
  }
};
