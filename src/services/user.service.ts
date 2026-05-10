import bcrypt from "bcryptjs";
import { createDefaultPreferencesForUser } from "../db/seed";
import { logger } from "../lib/logger";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "../helpers/token";
import { financialPeriodRepository } from "../repositories/financial-period.repository";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { userRepository } from "../repositories/user.repository";
import {
  ensureEmailNotExists,
  validateCreateSession,
  validateGoogleSession,
} from "../validations/user.validation";

interface ICreateUserInput {
  name: string;
  email: string;
  password: string;
}

interface ICreateSessionInput {
  email: string;
  password: string;
}

const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export const createUserService = async ({
  name,
  email,
  password,
}: ICreateUserInput) => {
  await ensureEmailNotExists(email);

  const hashedPassword = await hashPassword(password);

  const user = await userRepository.create({
    name,
    email,
    password: hashedPassword,
  });

  // Criar preferências de categorias padrão para o novo usuário
  try {
    await createDefaultPreferencesForUser(user.id);
  } catch (error) {
    // Log do erro, mas não impede a criação do usuário
    logger.error("Erro ao criar categorias padrão para o usuário", error as Error);
  }

  // Gerar access token e refresh token
  const accessToken = generateAccessToken(user.id);
  const refreshTokenValue = generateRefreshToken();
  const hashedRefreshToken = await hashRefreshToken(refreshTokenValue);

  // Calcular data de expiração (7 dias)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Salvar refresh token no banco
  await refreshTokenRepository.create({
    userId: user.id,
    token: hashedRefreshToken,
    expiresAt,
  });

  return {
    user,
    accessToken,
    refreshToken: refreshTokenValue,
  };
};

export const createSessionService = async ({
  email,
  password,
}: ICreateSessionInput) => {
  const user = await validateCreateSession(email, password);

  // Gerar access token e refresh token
  const accessToken = generateAccessToken(user.id);
  const refreshTokenValue = generateRefreshToken();
  const hashedRefreshToken = await hashRefreshToken(refreshTokenValue);

  // Calcular data de expiração (7 dias)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Salvar refresh token no banco
  await refreshTokenRepository.create({
    userId: user.id,
    token: hashedRefreshToken,
    expiresAt,
  });

  return {
    user,
    accessToken,
    refreshToken: refreshTokenValue,
  };
};

export const createGoogleSessionService = async (idToken: string) => {
  const user = await validateGoogleSession(idToken);

  // Gerar access token e refresh token
  const accessToken = generateAccessToken(user.id);
  const refreshTokenValue = generateRefreshToken();
  const hashedRefreshToken = await hashRefreshToken(refreshTokenValue);

  // Calcular data de expiração (7 dias)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Salvar refresh token no banco
  await refreshTokenRepository.create({
    userId: user.id,
    token: hashedRefreshToken,
    expiresAt,
  });

  return {
    user,
    accessToken,
    refreshToken: refreshTokenValue,
  };
};

/**
 * Serviço para renovar access token usando refresh token
 */
export const refreshTokenService = async (refreshToken: string) => {
  // O(n) bcrypt scan — trocar por token com ID lookup se volume crescer
  const allTokens = await refreshTokenRepository.findAllValid();

  // Comparar o refresh token fornecido com cada hash salvo
  let matchingToken = null;
  for (const tokenRecord of allTokens) {
    const isValid = await verifyRefreshToken(refreshToken, tokenRecord.token);
    if (isValid) {
      matchingToken = tokenRecord;
      break;
    }
  }

  if (!matchingToken) {
    throw new Error("Refresh token inválido ou expirado");
  }

  // Buscar usuário
  const user = await userRepository.findById(matchingToken.userId);

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  // Gerar novo access token
  const newAccessToken = generateAccessToken(user.id);

  return {
    user,
    accessToken: newAccessToken,
  };
};

/**
 * Serviço para fazer logout (revogar refresh token)
 */
export const revokeRefreshTokenService = async (
  userId: string,
  refreshToken: string
) => {
  // Buscar todos os refresh tokens do usuário
  const userTokens = await refreshTokenRepository.findByUserId(userId);

  // Comparar o refresh token fornecido com cada hash salvo
  let matchingToken = null;
  for (const tokenRecord of userTokens) {
    const isValid = await verifyRefreshToken(refreshToken, tokenRecord.token);
    if (isValid) {
      matchingToken = tokenRecord;
      break;
    }
  }

  if (!matchingToken) {
    throw new Error("Refresh token não encontrado");
  }

  // Deletar refresh token
  await refreshTokenRepository.delete(matchingToken.id);

  return { success: true };
};

export const updatefinancialPeriodService = async (
  userId: string,
  financialDayStart: number,
  financialDayEnd: number
) => {
  const user = await userRepository.updateFinancialPeriod(
    userId,
    financialDayStart,
    financialDayEnd
  );
  if (!user) throw new Error("Usuário não encontrado");
  await financialPeriodRepository.deactivatePeriods(userId);
  return user;
};

export const updateIncomeAndPeriodService = async (
  userId: string,
  monthlyIncome: number,
  financialDayStart: number,
  financialDayEnd: number
) => {
  const user = await userRepository.updateIncomeAndPeriod(
    userId,
    monthlyIncome,
    financialDayStart,
    financialDayEnd
  );
  if (!user) throw new Error("Usuário não encontrado");
  await financialPeriodRepository.deactivatePeriods(userId);
  return user;
};

export const updateUserProfileService = async (
  user: {
    id: string;
    name: string;
    email: string;
    monthlyIncome: string | null;
    financialDayStart: number | null;
    financialDayEnd: number | null;
    firstAccess: boolean | null;
  },
  data: {
    monthlyIncome?: number;
    financialDayStart?: number;
    financialDayEnd?: number;
  }
) => {
  // O usuário já foi validado no middleware, então podemos usar diretamente
  let updatedUser = user;

  if (data.monthlyIncome !== undefined) {
    const updated = await userRepository.updateMonthlyIncome(
      user.id,
      data.monthlyIncome
    );
    if (updated) updatedUser = updated;
  }

  if (
    data.financialDayStart !== undefined &&
    data.financialDayEnd !== undefined
  ) {
    const updated = await userRepository.updateFinancialPeriod(
      user.id,
      data.financialDayStart,
      data.financialDayEnd
    );
    if (updated) updatedUser = updated;
  }

  return {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    monthlyIncome: updatedUser.monthlyIncome,
    financialDayStart: updatedUser.financialDayStart,
    financialDayEnd: updatedUser.financialDayEnd,
    firstAccess: updatedUser.firstAccess,
  };
};
