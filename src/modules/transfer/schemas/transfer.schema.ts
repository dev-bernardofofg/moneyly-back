import { z } from 'zod';

export const createTransferSchema = z
  .object({
    fromAccountId: z.string().uuid('O ID da conta de origem deve ser um UUID válido.'),
    toAccountId: z.string().uuid('O ID da conta de destino deve ser um UUID válido.'),
    amount: z
      .number({ required_error: 'O valor é obrigatório.' })
      .int('O valor deve ser em centavos (inteiro).')
      .positive('O valor deve ser maior que zero.')
      .max(999999999, 'O valor não pode ser maior que R$ 9.999.999,99.'),
    date: z
      .string({ required_error: 'A data é obrigatória.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'A data deve estar no formato AAAA-MM-DD.'),
    description: z.string().max(500, 'A descrição pode ter no máximo 500 caracteres.').optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Origem e destino precisam ser contas diferentes.',
    path: ['toAccountId'],
  });

export const listTransfersQuerySchema = z.object({
  periodId: z.string().uuid('O ID do período deve ser um UUID válido.').optional(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
