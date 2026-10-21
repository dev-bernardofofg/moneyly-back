import { spMidnight } from '@core/helpers/dates';
import { z } from 'zod';

const MAX_IMPORT_ITEMS = 500;

// base64url sem padding: o sanitizeData global remove "<", ">" e "on\w+=" de strings
// do body, o que corromperia o OFX em texto puro ou um base64 com "=".
export const previewImportSchema = z.object({
  file: z
    .string({ required_error: 'O arquivo OFX é obrigatório.' })
    .min(1, 'O arquivo OFX está vazio.')
    .max(7_000_000, 'O arquivo OFX pode ter no máximo 5 MB.')
    .regex(/^[A-Za-z0-9_-]+$/, 'O arquivo deve ser enviado em base64url sem padding.'),
});

const isoDay = z
  .string()
  .datetime({ message: 'A data deve estar no formato ISO 8601.' })
  .transform((value) => spMidnight(new Date(value)));

export const confirmImportSchema = z
  .object({
    accountId: z
      .string({ required_error: 'Escolha a conta ou o cartão do extrato.' })
      .uuid('O ID da conta deve ser um UUID válido.'),
    items: z
      .array(
        z.object({
          externalId: z.string().min(1).max(200),
          type: z.enum(['income', 'expense']),
          title: z.string().min(1).max(100),
          amount: z.number().int().positive().max(999999999),
          // Contrato: dia-semântica → meia-noite SP.
          date: z
            .string()
            .datetime({ message: 'A data deve estar no formato ISO 8601.' })
            .transform((value) => spMidnight(new Date(value))),
          categoryId: z.string().uuid('O ID da categoria deve ser um UUID válido.'),
        })
      )
      .max(MAX_IMPORT_ITEMS, `Importe no máximo ${MAX_IMPORT_ITEMS} transações por vez.`),
    // Linhas "pagamento de fatura" do extrato: marcam a fatura como paga, importadas ou não.
    billPayments: z
      .array(
        z.object({
          type: z.enum(['income', 'expense']),
          amount: z.number().int().positive().max(999999999),
          date: isoDay,
        })
      )
      .max(MAX_IMPORT_ITEMS)
      .default([]),
  })
  .refine((data) => data.items.length + data.billPayments.length > 0, {
    message: 'Selecione ao menos uma transação para importar.',
    path: ['items'],
  });

export type ConfirmImportInput = z.infer<typeof confirmImportSchema>;
