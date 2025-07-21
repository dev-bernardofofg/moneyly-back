import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nome da categoria é obrigatório"),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Nome da categoria é obrigatório"),
});

export const createCategoryBudgetSchema = z.object({
  categoryId: z.string().uuid("ID da categoria inválido"),
  monthlyLimit: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(z.number().positive("Limite mensal deve ser positivo")),
});

export const updateCategoryBudgetSchema = z.object({
  monthlyLimit: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(z.number().positive("Limite mensal deve ser positivo")),
});
