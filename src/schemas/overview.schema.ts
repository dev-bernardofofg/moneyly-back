import { z } from "zod";

export const getDashboardOverviewSchema = z.object({
  periodId: z.string().optional(), // ID do período específico (ex: "2024-07-05T00:00:00.000Z_2024-08-05T00:00:00.000Z")
});

export const getAvailablePeriodsSchema = z.object({
  // userId vem do middleware de autenticação, não precisa ser enviado no body
});

export type GetDashboardOverviewRequest = z.infer<
  typeof getDashboardOverviewSchema
>;
export type GetAvailablePeriodsRequest = z.infer<
  typeof getAvailablePeriodsSchema
>;
