import { z } from "./registry";

/**
 * Envelopes de resposta do ResponseHandler (ver moneyly-back/.specs/02-conventions.md).
 * Os schemas Zod do projeto validam só REQUEST; o envelope de RESPONSE é montado aqui.
 *
 * TODO(I1): trocar `z.unknown()` por schemas de resposta reais por endpoint
 * conforme forem sendo modelados (ganho de tipagem no front via Kubb/Orval).
 */

export const wrapSuccess = (data: z.ZodTypeAny = z.unknown()) =>
  z.object({
    data,
    message: z.string().optional(),
  });

const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const wrapPaginated = (item: z.ZodTypeAny = z.unknown()) =>
  z.object({
    success: z.literal(true),
    data: z.array(item),
    pagination: paginationSchema,
    message: z.string().optional(),
  });

/** Envelope custom de GET /transactions/ : data[] + pagination + summary */
export const wrapPaginatedWithSummary = (
  item: z.ZodTypeAny,
  summary: z.ZodTypeAny
) =>
  z.object({
    success: z.literal(true),
    data: z.array(item),
    pagination: paginationSchema,
    summary,
    message: z.string().optional(),
  });

export const errorResponse = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});
