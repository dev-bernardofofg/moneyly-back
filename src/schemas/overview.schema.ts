import { z } from "zod";

export const getDashboardOverviewSchema = z.object({
  userId: z.string().uuid("ID do usuário deve ser um UUID válido"),
  periodId: z.string().optional(), // ID do período específico (ex: "2024-07-05T00:00:00.000Z_2024-08-05T00:00:00.000Z")
});

export const getAvailablePeriodsSchema = z.object({
  userId: z.string().uuid("ID do usuário deve ser um UUID válido"),
});

export type GetDashboardOverviewRequest = z.infer<
  typeof getDashboardOverviewSchema
>;
export type GetAvailablePeriodsRequest = z.infer<
  typeof getAvailablePeriodsSchema
>;
