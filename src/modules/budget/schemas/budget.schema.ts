import { z } from 'zod';

export const createCategoryBudgetSchema = z.object({
  categoryId: z.string().uuid('ID da categoria inválido'),
  monthlyLimit: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(
      z
        .number()
        .int('O valor deve ser em centavos (inteiro).')
        .positive('Limite mensal deve ser positivo')
        .max(999999999)
    ),
});

export const updateCategoryBudgetSchema = z.object({
  monthlyLimit: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(
      z
        .number()
        .int('O valor deve ser em centavos (inteiro).')
        .positive('Limite mensal deve ser positivo')
        .max(999999999)
    ),
});

export const getBudgetsQuerySchema = z.object({
  periodId: z.string().uuid('periodId inválido').optional(),
});
