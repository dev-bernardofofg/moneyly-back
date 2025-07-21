import { z } from "zod";

// Schema para atualizar rendimento mensal
export const updateMonthlyIncomeSchema = z.object({
  monthlyIncome: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(
      z
        .number()
        .positive("Rendimento deve ser positivo")
        .max(999999999.99, "Rendimento muito alto")
    ),
});

// Schema para atualizar período financeiro
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
        "Período financeiro inválido. Exemplos válidos: dia 5 a dia 5, dia 1 a dia 31, dia 15 a dia 14",
      path: ["financialDayEnd"],
    }
  );

// Schema para atualizar rendimento e período financeiro juntos
export const updateIncomeAndPeriodSchema = z
  .object({
    monthlyIncome: z
      .union([z.string(), z.number()])
      .transform((val) => {
        const num = typeof val === "string" ? parseFloat(val) : val;
        return isNaN(num) ? 0 : num;
      })
      .pipe(
        z
          .number()
          .positive("Rendimento deve ser positivo")
          .max(999999999.99, "Rendimento muito alto")
      ),
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
        "Período financeiro inválido. Exemplos válidos: dia 5 a dia 5, dia 1 a dia 31, dia 15 a dia 14",
      path: ["financialDayEnd"],
    }
  );

// Schema para atualizar perfil do usuário
export const updateUserProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  email: z.string().email("Email inválido").max(100, "Email muito longo"),
});

// Schema para atualizar senha
export const updatePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(6, "Senha atual deve ter pelo menos 6 caracteres"),
    newPassword: z
      .string()
      .min(6, "Nova senha deve ter pelo menos 6 caracteres")
      .max(100, "Nova senha muito longa"),
  })
  .refine(
    (data) => {
      return data.currentPassword !== data.newPassword;
    },
    {
      message: "Nova senha deve ser diferente da senha atual",
      path: ["newPassword"],
    }
  );
