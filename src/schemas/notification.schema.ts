import { z } from "zod";

export const notificationQuerySchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => !val || val > 0, "Página deve ser maior que 0"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine(
      (val) => !val || (val > 0 && val <= 100),
      "Limite deve ser entre 1 e 100"
    ),
});
