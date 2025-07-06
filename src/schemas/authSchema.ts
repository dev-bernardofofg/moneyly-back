import { z } from "zod";

// Função para validar força da senha
const validatePasswordStrength = (password: string) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

// Schema para criação de usuário (registro)
export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
  email: z.string().email("Email inválido").max(100, "Email muito longo"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(128, "Senha muito longa")
    .refine(validatePasswordStrength, {
      message:
        "Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial",
    }),
});

// Schema para login
export const loginSchema = z.object({
  email: z.string().email("Email inválido").max(100, "Email muito longo"),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .max(128, "Senha muito longa"),
});

export const updateMonthlyIncomeSchema = z.object({
  monthlyIncome: z
    .number()
    .positive("Rendimento deve ser positivo")
    .max(999999999, "Rendimento muito alto"),
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
  id: z.string().uuid("ID inválido"),
});

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, "Página deve ser maior que 0"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, "Limite deve estar entre 1 e 100"),
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
      }, "Data de início inválida"),
    endDate: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Data de fim inválida"),
  })
  .merge(paginationQuerySchema);
