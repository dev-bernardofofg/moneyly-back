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
  periodId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
});

export const overtimeSummaryQuerySchema = z.object({
  periodId: z.string().uuid('periodId deve ser um UUID válido'),
});

export type CreateOvertimeInput = z.infer<typeof createOvertimeSchema>;
export type UpdateOvertimeInput = z.infer<typeof updateOvertimeSchema>;
