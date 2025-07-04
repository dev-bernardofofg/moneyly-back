import { Response } from "express";
import { PaginationHelper } from "../lib/pagination";
import { AuthenticatedRequest } from "../middlewares/auth";
import { CategoryRepository } from "../repositories/categoriesRepository";

export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const categoryExists = await CategoryRepository.findByNameAndUserId(
      req.body.name,
      req.userId
    );

    if (categoryExists) {
      return res.status(400).json({ error: "Categoria já existe" });
    }

    const { name } = req.body;

    const category = await CategoryRepository.create({
      name,
      userId: req.userId,
    });

    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar categoria" });
  }
};

export const getCategories = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { page, limit } = req.query;

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

      return res.status(200).json(result);
    } else {
      // Usar versão original (sem paginação)
      const categories = await CategoryRepository.findByUserId(req.userId);
      return res.status(200).json(categories);
    }
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar categorias" });
  }
};

export const updateCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { id } = req.params;
    const { name } = req.body;

    // Verificar se a categoria existe e pertence ao usuário
    const existingCategory = await CategoryRepository.findByIdAndUserId(
      id,
      req.userId
    );
    if (!existingCategory) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    // Verificar se já existe outra categoria com o mesmo nome para este usuário
    const categoryWithSameName = await CategoryRepository.findByNameAndUserId(
      name,
      req.userId
    );
    if (categoryWithSameName && categoryWithSameName.id !== id) {
      return res
        .status(400)
        .json({ error: "Já existe uma categoria com este nome" });
    }

    const category = await CategoryRepository.update(id, {
      name,
      userId: req.userId,
    });
    return res.status(200).json(category);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar categoria" });
  }
};

export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { id } = req.params;

    // Verificar se a categoria existe e pertence ao usuário
    const existingCategory = await CategoryRepository.findByIdAndUserId(
      id,
      req.userId
    );
    if (!existingCategory) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    await CategoryRepository.delete(id);
    return res.status(200).json({ message: "Categoria deletada com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao deletar categoria" });
  }
};
