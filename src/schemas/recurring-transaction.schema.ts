import { z } from 'zod';

const amountField = z
  .union([z.string(), z.number()])
  .transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  })
  .pipe(
    z
      .number({ invalid_type_error: 'O valor deve ser um número válido.' })
      .positive('O valor deve ser maior que zero.')
      .max(999999999, 'O valor não pode ser maior que 999.999.999.')
  );

const recurringTransactionBaseSchema = z.object({
  type: z.enum(['income', 'expense'], {
    required_error: "O tipo é obrigatório. Use 'income' ou 'expense'.",
  }),
  title: z
    .string({ required_error: 'O título é obrigatório.' })
    .min(1, 'O título deve ter pelo menos 1 caractere.')
    .max(100, 'O título pode ter no máximo 100 caracteres.'),
  amount: amountField,
  categoryId: z
    .string({ required_error: 'A categoria é obrigatória.' })
    .uuid('O ID da categoria deve ser um UUID válido.'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    required_error: 'A frequência é obrigatória.',
  }),
  dayOfMonth: z
    .number()
    .int()
    .min(1, 'O dia do mês deve ser entre 1 e 31.')
    .max(31, 'O dia do mês deve ser entre 1 e 31.')
    .optional(),
  dayOfWeek: z
    .number()
    .int()
    .min(0, 'O dia da semana deve ser entre 0 (domingo) e 6 (sábado).')
    .max(6, 'O dia da semana deve ser entre 0 (domingo) e 6 (sábado).')
    .optional(),
  description: z.string().max(500, 'A descrição pode ter no máximo 500 caracteres.').optional(),
  totalInstallments: z
    .number()
    .int()
    .min(1, 'O número de parcelas deve ser pelo menos 1.')
    .optional(),
  startDate: z
    .string()
    .datetime({ message: 'A data de início deve ser uma data válida no formato ISO 8601.' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const recurringTransactionSchema = recurringTransactionBaseSchema;

export const recurringTransactionUpdateSchema = recurringTransactionBaseSchema
  .omit({ type: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export const recurringTransactionQuerySchema = z.object({
  includeInactive: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => !val || val > 0, 'Página deve ser maior que 0'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => !val || (val > 0 && val <= 100), 'Limite deve ser entre 1 e 100'),
});

export type CreateRecurringTransactionBody = z.infer<typeof recurringTransactionSchema>;
export type UpdateRecurringTransactionBody = z.infer<typeof recurringTransactionUpdateSchema>;
