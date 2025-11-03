import { z } from "zod";

// Schema para parâmetros de paginação (query string)
export const paginationQuerySchema = z.object({
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

// Schema para paginação no corpo da requisição (números diretos)
export const paginationBodySchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z
    .number()
    .int()
    .positive()
    .max(100, "Limite deve ser entre 1 e 100")
    .optional(),
});

// Schema para query de transações (inclui paginação)
export const transactionQuerySchema = z
  .object({
    category: z.string().optional(),
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
  })
  .merge(paginationQuerySchema);

// Schema para corpo de transações (inclui paginação)
export const transactionBodySchema = z
  .object({
    category: z.string().optional(),
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
  })
  .merge(paginationBodySchema);

// Schema para query de categorias (inclui paginação)
export const categoryQuerySchema = paginationQuerySchema;

// Schema para query de transações (usa query params)
export const transactionListQuerySchema = transactionQuerySchema;
