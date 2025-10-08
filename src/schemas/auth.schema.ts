import { z } from "zod";

// Schema para criação de usuário (registro)
export const createUserSchema = z.object({
  name: z
    .string({
      required_error: "O nome é obrigatório.",
      invalid_type_error: "O nome deve ser um texto.",
    })
    .min(1, "O nome deve ter pelo menos 1 caractere.")
    .max(100, "O nome pode ter no máximo 100 caracteres."),
  email: z
    .string({
      required_error: "O email é obrigatório.",
      invalid_type_error: "O email deve ser um texto.",
    })
    .email("Por favor, forneça um email válido (exemplo: usuario@exemplo.com).")
    .max(100, "O email pode ter no máximo 100 caracteres."),
  password: z
    .string({
      required_error: "A senha é obrigatória.",
      invalid_type_error: "A senha deve ser um texto.",
    })
    .min(6, "A senha deve ter pelo menos 6 caracteres.")
    .max(128, "A senha pode ter no máximo 128 caracteres."),
});

export const createSessionSchema = z.object({
  email: z
    .string({
      required_error: "O email é obrigatório para fazer login.",
      invalid_type_error: "O email deve ser um texto.",
    })
    .email("Por favor, forneça um email válido."),
  password: z
    .string({
      required_error: "A senha é obrigatória para fazer login.",
      invalid_type_error: "A senha deve ser um texto.",
    })
    .min(1, "A senha não pode estar vazia."),
});

export const googleAuthSchema = z.object({
  idToken: z
    .string({
      required_error: "O token do Google é obrigatório.",
      invalid_type_error: "O token deve ser um texto.",
    })
    .min(1, "O token do Google não pode estar vazio."),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

// Schema para login
export const loginSchema = z.object({
  email: z
    .string({
      required_error: "O email é obrigatório.",
      invalid_type_error: "O email deve ser um texto.",
    })
    .email("Por favor, forneça um email válido.")
    .max(100, "O email pode ter no máximo 100 caracteres."),
  password: z
    .string({
      required_error: "A senha é obrigatória.",
      invalid_type_error: "A senha deve ser um texto.",
    })
    .min(1, "A senha não pode estar vazia.")
    .max(128, "A senha pode ter no máximo 128 caracteres."),
});

export const updateMonthlyIncomeSchema = z.object({
  monthlyIncome: z
    .number({
      required_error: "O rendimento mensal é obrigatório.",
      invalid_type_error: "O rendimento deve ser um número.",
    })
    .positive("O rendimento mensal deve ser um valor positivo.")
    .max(999999999, "O rendimento não pode ser maior que 999.999.999."),
});

export const updateFinancialPeriodSchema = z
  .object({
    financialDayStart: z
      .number()
      .min(1, "Dia de início deve ser entre 1 e 31")
      .max(31, "Dia de início deve ser entre 1 e 31"),
    financialDayEnd: z
      .number()
      .min(1, "Dia de fim deve ser entre 1 e 31")
      .max(31, "Dia de fim deve ser entre 1 e 31"),
  })
  .refine(
    (data) => {
      // Validar que o período faz sentido (ex: 5 a 5, 1 a 31, etc.)
      if (data.financialDayStart === data.financialDayEnd) {
        return true; // Período de um dia (ex: 5 a 5)
      }

      // Para períodos que cruzam meses (ex: 5 a 4 do próximo mês)
      if (data.financialDayStart > data.financialDayEnd) {
        return true; // Válido (ex: 5 a 4)
      }

      // Para períodos dentro do mesmo mês (ex: 1 a 31)
      return data.financialDayStart < data.financialDayEnd;
    },
    {
      message:
        "Período financeiro inválido. Exemplos válidos: 5 a 5, 1 a 31, 15 a 14",
      path: ["financialDayEnd"],
    }
  );

export const updateIncomeAndPeriodSchema = z
  .object({
    monthlyIncome: z
      .number()
      .positive("Rendimento deve ser positivo")
      .max(999999999, "Rendimento muito alto"),
    financialDayStart: z
      .number()
      .min(1, "Dia de início deve ser entre 1 e 31")
      .max(31, "Dia de início deve ser entre 1 e 31"),
    financialDayEnd: z
      .number()
      .min(1, "Dia de fim deve ser entre 1 e 31")
      .max(31, "Dia de fim deve ser entre 1 e 31"),
  })
  .refine(
    (data) => {
      if (data.financialDayStart === data.financialDayEnd) {
        return true;
      }

      if (data.financialDayStart > data.financialDayEnd) {
        return true;
      }

      return data.financialDayStart < data.financialDayEnd;
    },
    {
      message:
        "Período financeiro inválido. Exemplos válidos: 5 a 5, 1 a 31, 15 a 14",
      path: ["financialDayEnd"],
    }
  );

// Schema para parâmetros de ID (usado em várias rotas)
export const idParamSchema = z.object({
  id: z
    .string({
      required_error: "O ID é obrigatório.",
      invalid_type_error: "O ID deve ser um texto.",
    })
    .uuid("O ID deve ser um UUID válido."),
});

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, "O número da página deve ser maior que 0."),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine(
      (val) => val > 0 && val <= 100,
      "O limite de itens por página deve estar entre 1 e 100."
    ),
});

export const transactionQuerySchema = z
  .object({
    category: z.string().optional(),
    startDate: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "A data de início deve ser uma data válida."),
    endDate: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "A data de fim deve ser uma data válida."),
  })
  .merge(paginationQuerySchema);
