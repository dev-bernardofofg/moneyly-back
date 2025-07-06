import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(50, "Senha deve ter no máximo 50 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const updateMonthlyIncomeSchema = z.object({
  monthlyIncome: z
    .number()
    .positive("Rendimento deve ser positivo")
    .max(999999999, "Rendimento muito alto"),
});

export const idParamSchema = z.object({
  id: z.string().uuid("ID inválido"),
});

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, "Página deve ser maior que 0"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, "Limite deve estar entre 1 e 100"),
});

export const transactionQuerySchema = z
  .object({
    category: z.string().optional(),
    startDate: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Data de início inválida"),
    endDate: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Data de fim inválida"),
  })
  .merge(paginationQuerySchema);
