import { Response } from "express";
import { PaginationHelper } from "../lib/pagination";
import { ResponseHandler } from "../lib/ResponseHandler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { CategoryRepository } from "../repositories/categoriesRepository";

export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const categoryExists = await CategoryRepository.findByNameAndUserId(
      req.body.name,
      req.userId
    );

    if (categoryExists) {
      return ResponseHandler.error(res, "Categoria já existe");
    }

    const { name } = req.body;

    const category = await CategoryRepository.create({
      name,
      userId: req.userId,
    });

    return ResponseHandler.created(
      res,
      category,
      "Categoria criada com sucesso"
    );
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return ResponseHandler.serverError(res);
  }
};

export const getCategories = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { page, limit } = req.body;

    // Verificar se há parâmetros de paginação
    const hasPagination = page || limit;

    if (hasPagination) {
      // Usar versão paginada
      const paginationParams = {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      const pagination = PaginationHelper.validateAndParse(paginationParams);
      const result = await CategoryRepository.findByUserIdPaginated(
        req.userId,
        pagination
      );

      return ResponseHandler.success(
        res,
        {
          categories: result.data,
          totalCount: result.pagination.total,
        },
        "Categorias recuperadas com sucesso"
      );
    } else {
      // Usar versão original (sem paginação)
      const categories = await CategoryRepository.findByUserId(req.userId);
      return ResponseHandler.success(
        res,
        {
          categories,
        },
        "Categorias recuperadas com sucesso"
      );
    }
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return ResponseHandler.serverError(res);
  }
};

export const updateCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { id } = req.params;
    const { name } = req.body;

    // Verificar se a categoria existe e pertence ao usuário
    const existingCategory = await CategoryRepository.findByIdAndUserId(
      id,
      req.userId
    );
    if (!existingCategory) {
      return ResponseHandler.notFound(res, "Categoria não encontrada");
    }

    // Verificar se já existe outra categoria com o mesmo nome para este usuário
    const categoryWithSameName = await CategoryRepository.findByNameAndUserId(
      name,
      req.userId
    );
    if (categoryWithSameName && categoryWithSameName.id !== id) {
      return ResponseHandler.error(
        res,
        "Já existe uma categoria com este nome"
      );
    }

    const category = await CategoryRepository.update(id, {
      name,
      userId: req.userId,
    });
    return ResponseHandler.success(
      res,
      category,
      "Categoria atualizada com sucesso"
    );
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return ResponseHandler.serverError(res);
  }
};

export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { id } = req.params;

    // Verificar se a categoria existe e pertence ao usuário
    const existingCategory = await CategoryRepository.findByIdAndUserId(
      id,
      req.userId
    );
    if (!existingCategory) {
      return ResponseHandler.notFound(res, "Categoria não encontrada");
    }

    await CategoryRepository.delete(id);
    return ResponseHandler.success(res, null, "Categoria deletada com sucesso");
  } catch (error) {
    console.error("Erro ao deletar categoria:", error);
    return ResponseHandler.serverError(res);
  }
};
