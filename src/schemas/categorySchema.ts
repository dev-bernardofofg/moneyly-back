import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "O nome da categoria é obrigatório")
    .max(50, "O nome da categoria deve ter no máximo 50 caracteres"),
});

export const categoryUpdateSchema = categorySchema.partial();
