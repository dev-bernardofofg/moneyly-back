import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"], {
    required_error: "O tipo é obrigatório",
    invalid_type_error: "Tipo inválido",
  }),
  title: z.string().min(1, "O título é obrigatório"),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(
      z
        .number({ invalid_type_error: "O amount deve ser um número" })
        .positive("O valor deve ser positivo")
    ),
  category: z
    .string()
    .uuid("ID da categoria deve ser um UUID válido")
    .min(1, "A categoria é obrigatória"),
  description: z.string().optional(),
  date: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        const parsed = new Date(value);
        return parsed <= new Date();
      },
      {
        message: "A data não pode ser no futuro.",
      }
    ),
});

export const transactionUpdateSchema = transactionSchema.partial();
