import { Response } from "express";
import { ResponseHandler } from "../helpers/response-handler";
import { AuthenticatedRequest } from "../middlewares/auth";
import {
  createCategoryService,
  deleteCategoryService,
  getCategoriesService,
  updateCategoryService,
} from "../services/category.service";

export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { name } = req.body;
  const { userId } = req;

  if (!userId) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  try {
    const category = await createCategoryService(name, userId);
    return ResponseHandler.success(
      res,
      category,
      "Categoria criada com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Não foi possível criar a categoria. Verifique se o nome não está duplicado e tente novamente.",
      error
    );
  }
};

export const getCategories = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { userId } = req;
  // Query params já foram validados e transformados pelo middleware
  const { page, limit } = req.query as {
    page?: number;
    limit?: number;
  };

  if (!userId) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  try {
    const result = await getCategoriesService(userId, { page, limit });

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
    return ResponseHandler.error(
      res,
      "Não foi possível buscar as categorias. Por favor, tente novamente.",
      error
    );
  }
};

export const updateCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.params;
  const { name } = req.body;
  const { userId } = req;

  if (!userId) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  if (!id) {
    return ResponseHandler.badRequest(res, "ID da categoria não fornecido");
  }

  try {
    const category = await updateCategoryService(id, name, userId);
    return ResponseHandler.success(
      res,
      category,
      "Categoria atualizada com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Não foi possível atualizar a categoria. Verifique se o novo nome não está em uso e tente novamente.",
      error
    );
  }
};

export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.params;
  const { userId } = req;

  if (!userId) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  if (!id) {
    return ResponseHandler.badRequest(res, "ID da categoria não fornecido");
  }

  try {
    await deleteCategoryService(id, userId);
    return ResponseHandler.success(res, null, "Categoria deletada com sucesso");
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Não foi possível deletar a categoria. Categorias globais não podem ser deletadas.",
      error
    );
  }
};
