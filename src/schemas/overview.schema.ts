import { z } from 'zod';

export const getDashboardOverviewQuerySchema = z.object({
  periodId: z.string().uuid().optional(),
  startDate: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Data de início inválida'),
  endDate: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Data de fim inválida'),
});

export const getAvailablePeriodsQuerySchema = z.object({});

export const forecastQuerySchema = z.object({
  periodId: z.string().uuid('periodId inválido').optional(),
});

export const comparativeInsightsQuerySchema = z.object({
  periodsBack: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine(
      (val) => val === undefined || (val >= 1 && val <= 12),
      'periodsBack deve estar entre 1 e 12'
    ),
});

export type GetDashboardOverviewQuery = z.infer<typeof getDashboardOverviewQuerySchema>;
export type GetAvailablePeriodsQuery = z.infer<typeof getAvailablePeriodsQuerySchema>;
