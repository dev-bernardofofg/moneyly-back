import { hash } from '../helpers/bcrypt';
import { createDefaultPreferencesForUser } from '../db/seed';
import { logger } from '../lib/logger';
import { NotFoundError, UnauthorizedError } from './errors';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from '../helpers/token';
import { financialPeriodRepository } from '../repositories/financial-period.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { userRepository } from '../repositories/user.repository';
import {
  ensureEmailNotExists,
  validateCreateSession,
  validateGoogleSession,
} from '../validations/user.validation';
import type { CreateSessionInput, CreateUserInput } from '../schemas/auth.schema';

const REFRESH_TOKEN_TTL_DAYS = 7;

const issueTokenPair = async (userId: string) => {
  const accessToken = generateAccessToken(userId);
  const refreshTokenValue = generateRefreshToken();
  const hashedRefreshToken = await hashRefreshToken(refreshTokenValue);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await refreshTokenRepository.create({
    userId,
    token: hashedRefreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken: refreshTokenValue };
};

export const createUserService = async ({ name, email, password }: CreateUserInput) => {
  await ensureEmailNotExists(email);

  const hashedPassword = await hash(password);

  const user = await userRepository.create({
    name,
    email,
    password: hashedPassword,
  });

  try {
    await createDefaultPreferencesForUser(user.id);
  } catch (error) {
    logger.error('Erro ao criar categorias padrão para o usuário', error as Error);
  }

  const tokens = await issueTokenPair(user.id);
  return { user, ...tokens };
};

export const createSessionService = async ({ email, password }: CreateSessionInput) => {
  const user = await validateCreateSession(email, password);
  const tokens = await issueTokenPair(user.id);
  return { user, ...tokens };
};

export const createGoogleSessionService = async (idToken: string) => {
  const user = await validateGoogleSession(idToken);
  const tokens = await issueTokenPair(user.id);
  return { user, ...tokens };
};

export const refreshTokenService = async (refreshToken: string) => {
  const allTokens = await refreshTokenRepository.findAllValid();

  let matchingToken = null;
  for (const tokenRecord of allTokens) {
    const isValid = await verifyRefreshToken(refreshToken, tokenRecord.token);
    if (isValid) {
      matchingToken = tokenRecord;
      break;
    }
  }

  if (!matchingToken) {
    throw new UnauthorizedError('Refresh token inválido ou expirado');
  }

  const user = await userRepository.findById(matchingToken.userId);

  if (!user) {
    throw new NotFoundError('Usuário não encontrado');
  }

  const newAccessToken = generateAccessToken(user.id);

  return {
    user,
    accessToken: newAccessToken,
  };
};

export const revokeRefreshTokenService = async (userId: string, refreshToken: string) => {
  const userTokens = await refreshTokenRepository.findByUserId(userId);

  let matchingToken = null;
  for (const tokenRecord of userTokens) {
    const isValid = await verifyRefreshToken(refreshToken, tokenRecord.token);
    if (isValid) {
      matchingToken = tokenRecord;
      break;
    }
  }

  if (!matchingToken) {
    throw new NotFoundError('Refresh token não encontrado');
  }

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
  if (!user) throw new NotFoundError('Usuário não encontrado');
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
  if (!user) throw new NotFoundError('Usuário não encontrado');
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
  let updatedUser = user;

  if (data.monthlyIncome !== undefined) {
    const updated = await userRepository.updateMonthlyIncome(user.id, data.monthlyIncome);
    if (updated) updatedUser = updated;
  }

  if (data.financialDayStart !== undefined && data.financialDayEnd !== undefined) {
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
