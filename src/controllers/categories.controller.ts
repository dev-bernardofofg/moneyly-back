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
    return ResponseHandler.error(res, "Erro ao criar categoria", error);
  }
};

export const getCategories = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.user;
  const { page, limit } = req.body;

  try {
    const result = await getCategoriesService(id, { page, limit });

    return ResponseHandler.success(
      res,
      {
        categories: result.data,
        pagination: result.pagination,
      },
      "Categorias recuperadas com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao buscar categorias", error);
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

  try {
    const category = await updateCategoryService(id, name, userId);
    return ResponseHandler.success(
      res,
      category,
      "Categoria atualizada com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao atualizar categoria", error);
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

  try {
    await deleteCategoryService(id, userId);
    return ResponseHandler.success(res, null, "Categoria deletada com sucesso");
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao deletar categoria", error);
  }
};
