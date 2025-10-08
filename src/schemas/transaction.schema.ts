import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"], {
    required_error:
      "O tipo da transação é obrigatório. Escolha 'income' (receita) ou 'expense' (despesa).",
    invalid_type_error:
      "Tipo inválido. Use 'income' para receitas ou 'expense' para despesas.",
  }),
  title: z
    .string({
      required_error: "O título da transação é obrigatório.",
      invalid_type_error: "O título deve ser um texto.",
    })
    .min(1, "O título deve ter pelo menos 1 caractere.")
    .max(100, "O título pode ter no máximo 100 caracteres."),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(
      z
        .number({ invalid_type_error: "O valor deve ser um número válido." })
        .positive("O valor deve ser maior que zero.")
        .max(999999999, "O valor não pode ser maior que 999.999.999.")
    ),
  category: z
    .string({
      required_error: "A categoria é obrigatória.",
      invalid_type_error: "A categoria deve ser um texto.",
    })
    .uuid("O ID da categoria deve ser um UUID válido.")
    .min(1, "Selecione uma categoria para a transação."),
  // ← NOVO CAMPO (opcional, pode ser calculado automaticamente)
  periodId: z
    .string()
    .uuid("O ID do período deve ser um UUID válido.")
    .optional(),
  description: z
    .string()
    .max(500, "A descrição pode ter no máximo 500 caracteres.")
    .optional(),
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
        message:
          "A data não pode ser no futuro. Use uma data de hoje ou anterior.",
      }
    ),
});

export const transactionUpdateSchema = transactionSchema.partial();
