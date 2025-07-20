import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nome da categoria é obrigatório"),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Nome da categoria é obrigatório"),
});

export const createCategoryBudgetSchema = z.object({
  categoryId: z.string().uuid("ID da categoria inválido"),
  monthlyLimit: z.number().positive("Limite mensal deve ser positivo"),
});

export const updateCategoryBudgetSchema = z.object({
  monthlyLimit: z.number().positive("Limite mensal deve ser positivo"),
});
