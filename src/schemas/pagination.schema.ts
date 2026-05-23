import { z } from 'zod';
import { baseFilterSchema } from './filter.schema';

export const paginationQuerySchema = z.object({
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

export const paginationBodySchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100, 'Limite deve ser entre 1 e 100').optional(),
});

export const categoryQuerySchema = paginationQuerySchema;

export const transactionListQuerySchema = baseFilterSchema.merge(paginationQuerySchema);
