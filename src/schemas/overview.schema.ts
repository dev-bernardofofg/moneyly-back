import { z } from "zod";

// Schema para query params do dashboard
export const getDashboardOverviewQuerySchema = z.object({
  periodId: z.string().optional(), // ID do período específico (ex: "2024-07-05T00:00:00.000Z_2024-08-05T00:00:00.000Z")
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
});

// Schema vazio para períodos (sem query params)
export const getAvailablePeriodsQuerySchema = z.object({});

export type GetDashboardOverviewQuery = z.infer<
  typeof getDashboardOverviewQuerySchema
>;
export type GetAvailablePeriodsQuery = z.infer<
  typeof getAvailablePeriodsQuerySchema
>;
