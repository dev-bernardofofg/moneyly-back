import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
});
