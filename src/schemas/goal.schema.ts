import { z } from "zod";

export const createSavingsGoalSchema = z.object({
  title: z
    .string({
      required_error: "O título do objetivo é obrigatório.",
      invalid_type_error: "O título deve ser um texto.",
    })
    .min(1, "O título deve ter pelo menos 1 caractere.")
    .max(100, "O título pode ter no máximo 100 caracteres."),
  description: z
    .string()
    .max(500, "A descrição pode ter no máximo 500 caracteres.")
    .optional(),
  targetAmount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(
      z
        .number({ invalid_type_error: "O valor deve ser um número válido." })
        .positive("O valor alvo deve ser maior que zero.")
        .max(999999999, "O valor não pode ser maior que 999.999.999.")
    ),
  targetDate: z
    .string({
      required_error: "A data alvo é obrigatória.",
      invalid_type_error: "A data deve ser um texto.",
    })
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "A data alvo deve ser uma data válida."),
});

export const updateSavingsGoalSchema = z.object({
  title: z
    .string()
    .min(1, "O título deve ter pelo menos 1 caractere.")
    .max(100, "O título pode ter no máximo 100 caracteres.")
    .optional(),
  description: z
    .string()
    .max(500, "A descrição pode ter no máximo 500 caracteres.")
    .optional(),
  targetAmount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(
      z
        .number()
        .positive("O valor alvo deve ser maior que zero.")
        .max(999999999, "O valor não pode ser maior que 999.999.999.")
    )
    .optional(),
  targetDate: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "A data alvo deve ser uma data válida.")
    .optional(),
  currentAmount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(z.number().min(0, "O valor atual não pode ser negativo."))
    .optional(),
  isActive: z
    .boolean({
      invalid_type_error: "O campo 'isActive' deve ser verdadeiro ou falso.",
    })
    .optional(),
});

export const addAmountToGoalSchema = z.object({
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
});
