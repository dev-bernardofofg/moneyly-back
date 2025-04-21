import { z } from 'zod';

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    required_error: 'O tipo é obrigatório',
    invalid_type_error: 'Tipo inválido',
  }),
  amount: z
    .number({ invalid_type_error: 'O amount deve ser um número' })
    .positive('O valor deve ser positivo'),
  category: z.string().min(1, 'A categoria é obrigatória'),
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
        message: 'A data não pode ser no futuro.',
      }
    ),
});

export const transactionUpdateSchema = transactionSchema.partial()