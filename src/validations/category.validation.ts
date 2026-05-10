import { categoryRepository } from "../repositories/categories.repository";
import { HttpError } from "./errors";

export const validateCategoryExists = async (name: string) => {
  const category = await categoryRepository.findByName(name);
  if (category) {
    throw new HttpError(400, "Categoria já existe");
  }
};

export const validateCategoryExistsByUserId = async (
  id: string,
  userId: string
) => {
  const category = await categoryRepository.findByIdAndUserId(id, userId);
  if (!category) {
    throw new HttpError(404, "Categoria não encontrada");
  }
};

export const validateCategoryIsNotGlobal = async (
  id: string,
  userId: string
) => {
  const category = await categoryRepository.findByIdAndUserId(id, userId);
  if (category?.isGlobal) {
    throw new HttpError(400, "Não é possível editar categorias globais");
  }
};

export const validateCategoryNameIsNotInUse = async (
  name: string,
  userId: string
) => {
  const category = await categoryRepository.findByNameAndUserId(name, userId);
  if (category) {
    throw new HttpError(400, "Categoria já existe");
  }
};

export const validateHideGlobalCategory = async (
  id: string,
  userId: string
) => {
  const category = await categoryRepository.hideGlobalCategoryForUser(
    userId,
    id
  );
  if (!category) {
    throw new HttpError(400, "Não é possível ocultar categorias globais");
  }
};
