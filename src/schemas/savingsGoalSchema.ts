import { z } from "zod";

export const createSavingsGoalSchema = z.object({
  title: z.string().min(1, "Título do objetivo é obrigatório"),
  description: z.string().optional(),
  targetAmount: z.number().positive("Valor alvo deve ser positivo"),
  targetDate: z.string().datetime("Data alvo deve ser uma data válida"),
});

export const updateSavingsGoalSchema = z.object({
  title: z.string().min(1, "Título do objetivo é obrigatório").optional(),
  description: z.string().optional(),
  targetAmount: z.number().positive("Valor alvo deve ser positivo").optional(),
  targetDate: z
    .string()
    .datetime("Data alvo deve ser uma data válida")
    .optional(),
  currentAmount: z
    .number()
    .min(0, "Valor atual não pode ser negativo")
    .optional(),
  isActive: z.boolean().optional(),
});

export const addAmountToGoalSchema = z.object({
  amount: z.number().positive("Valor deve ser positivo"),
});
