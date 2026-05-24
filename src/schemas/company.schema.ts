import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1).max(100),
  hourlyRate: z.number().positive('hourlyRate deve ser positivo'),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  hourlyRate: z.number().positive('hourlyRate deve ser positivo').optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
