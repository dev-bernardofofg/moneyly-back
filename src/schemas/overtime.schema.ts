import { z } from 'zod';

export const createOvertimeSchema = z.object({
  companyId: z.string().uuid('companyId deve ser um UUID válido'),
  categoryId: z.string().uuid('categoryId deve ser um UUID válido').optional(),
  description: z.string().max(500).optional(),
  startTime: z.string().datetime({ message: 'startTime deve ser uma data ISO válida' }),
  endTime: z.string().datetime({ message: 'endTime deve ser uma data ISO válida' }),
});

export const updateOvertimeSchema = z.object({
  companyId: z.string().uuid('companyId deve ser um UUID válido').optional(),
  categoryId: z.string().uuid('categoryId deve ser um UUID válido').optional(),
  description: z.string().max(500).optional(),
  startTime: z.string().datetime({ message: 'startTime deve ser uma data ISO válida' }).optional(),
  endTime: z.string().datetime({ message: 'endTime deve ser uma data ISO válida' }).optional(),
});

export const overtimeListQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
  companyId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100, 'Limite deve ser entre 1 e 100').optional(),
});

export const overtimeSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export const overtimeExportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
  companyId: z.string().uuid().optional(),
});

export type CreateOvertimeInput = z.infer<typeof createOvertimeSchema>;
export type UpdateOvertimeInput = z.infer<typeof updateOvertimeSchema>;
