import { z } from 'zod';

const dayOfMonth = (label: string) =>
  z
    .number({ invalid_type_error: `O dia de ${label} deve ser um número.` })
    .int()
    .min(1, `O dia de ${label} deve ser entre 1 e 31.`)
    .max(31, `O dia de ${label} deve ser entre 1 e 31.`);

const name = z
  .string({ required_error: 'O nome é obrigatório.' })
  .trim()
  .min(1, 'O nome é obrigatório.')
  .max(60, 'O nome pode ter no máximo 60 caracteres.');

export const createAccountSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('checking'), name }),
  z.object({
    type: z.literal('credit_card'),
    name,
    closingDay: dayOfMonth('fechamento'),
    dueDay: dayOfMonth('vencimento'),
  }),
]);

// Tipo não muda depois de criado: cartão e conta têm regras de período diferentes.
export const updateAccountSchema = z
  .object({
    name: name.optional(),
    closingDay: dayOfMonth('fechamento').optional(),
    dueDay: dayOfMonth('vencimento').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualizar.');

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
