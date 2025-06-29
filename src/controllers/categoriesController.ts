import { Response } from "express";
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
    const categories = await CategoryRepository.findByUserId(req.userId);
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar categorias" });
  }
};
