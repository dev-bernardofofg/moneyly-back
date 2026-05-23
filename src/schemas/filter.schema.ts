import { z } from 'zod';

const isoDateField = (label: string) =>
  z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), `${label} inválida`);

export const dateRangeFilterSchema = z.object({
  startDate: isoDateField('Data de início'),
  endDate: isoDateField('Data de fim'),
});

export const periodFilterSchema = z.object({
  periodId: z.string().uuid('periodId deve ser um UUID válido').optional(),
});

export const typeFilterSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
});

export const categoryFilterSchema = z.object({
  category: z.string().optional(),
});

export const baseFilterSchema = dateRangeFilterSchema
  .merge(periodFilterSchema)
  .merge(typeFilterSchema)
  .merge(categoryFilterSchema);

export type BaseFilters = z.infer<typeof baseFilterSchema>;
