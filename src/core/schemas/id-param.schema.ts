import { z } from 'zod';

export const idParamSchema = z.object({
  id: z
    .string({
      required_error: 'O ID é obrigatório.',
      invalid_type_error: 'O ID deve ser um texto.',
    })
    .uuid('O ID deve ser um UUID válido.'),
});
