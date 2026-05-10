import { z } from "zod";

export const getDashboardOverviewQuerySchema = z.object({
  periodId: z.string().uuid().optional(),
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

export const getAvailablePeriodsQuerySchema = z.object({});

export type GetDashboardOverviewQuery = z.infer<
  typeof getDashboardOverviewQuerySchema
>;
export type GetAvailablePeriodsQuery = z.infer<
  typeof getAvailablePeriodsQuerySchema
>;
