import { CategoryRepository } from "../repositories/categories.repository";
import { HttpError } from "./errors";

export const validateCategoryExistsForUser = async (
  categoryId: string,
  userId: string
) => {
  const category = await CategoryRepository.findByIdAndUserId(
    categoryId,
    userId
  );
  if (!category) {
    throw new HttpError(
      404,
      "Categoria não encontrada ou não pertence ao usuário"
    );
  }
  return category;
};
