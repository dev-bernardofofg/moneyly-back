import { spMidnight } from '@core/helpers/dates';
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

// Saldo da conta corrente numa data: as transações anteriores a ela já estão no saldo.
const openingBalance = z
  .number({ invalid_type_error: 'O saldo deve ser um número.' })
  .int('O saldo deve ser em centavos (inteiro).')
  .min(-999999999)
  .max(999999999);
const openingBalanceDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'A data do saldo deve estar no formato AAAA-MM-DD.')
  .refine(
    (value) => spMidnight(value) <= spMidnight(new Date()),
    'A data do saldo não pode ser futura.'
  )
  .transform((value) => spMidnight(value));

export const createAccountSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('checking'),
    name,
    openingBalance: openingBalance.optional(),
    openingBalanceDate: openingBalanceDate.optional(),
  }),
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
    openingBalance: openingBalance.optional(),
    // null remove o saldo inicial.
    openingBalanceDate: openingBalanceDate.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualizar.');

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

const billDueDate = z
  .string({ required_error: 'Informe o vencimento da fatura.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'O vencimento deve estar no formato AAAA-MM-DD.');

export const markBillPaidSchema = z.object({ dueDate: billDueDate });

export const billPaymentParamsSchema = z.object({
  id: z.string().uuid('O ID deve ser um UUID válido.'),
  dueDate: billDueDate,
});
