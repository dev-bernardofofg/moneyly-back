import { hash } from '../helpers/bcrypt';
import { createDefaultPreferencesForUser } from '../db/seed';
import { logger } from '../lib/logger';
import { NotFoundError, UnauthorizedError } from './errors';
import { generateAccessToken, generateRefreshToken, hashRefreshToken } from '../helpers/token';
import { financialPeriodRepository } from '../repositories/financial-period.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { userRepository } from '../repositories/user.repository';
import type { IFinancialPeriodRepository } from '../repositories/interfaces/IFinancialPeriodRepository';
import type { IRefreshTokenRepository } from '../repositories/interfaces/IRefreshTokenRepository';
import type { IUserRepository } from '../repositories/interfaces/IUserRepository';
import {
  ensureEmailNotExists,
  validateCreateSession,
  validateGoogleSession,
} from '../validations/user.validation';
import type { CreateSessionInput, CreateUserInput } from '../schemas/auth.schema';

const REFRESH_TOKEN_TTL_DAYS = 7;

export interface UserServiceDeps {
  userRepository: Pick<
    IUserRepository,
    | 'create'
    | 'findById'
    | 'updateMonthlyIncome'
    | 'updateFinancialPeriod'
    | 'updateIncomeAndPeriod'
  >;
  refreshTokenRepository: Pick<
    IRefreshTokenRepository,
    'create' | 'findByToken' | 'findValidToken' | 'delete'
  >;
  financialPeriodRepository: Pick<IFinancialPeriodRepository, 'deactivatePeriods'>;
  seedDefaultPreferences: typeof createDefaultPreferencesForUser;
  hashPassword: typeof hash;
  tokens: {
    generateAccessToken: typeof generateAccessToken;
    generateRefreshToken: typeof generateRefreshToken;
    hashRefreshToken: typeof hashRefreshToken;
  };
  validations: {
    ensureEmailNotExists: typeof ensureEmailNotExists;
    validateCreateSession: typeof validateCreateSession;
    validateGoogleSession: typeof validateGoogleSession;
  };
}

export const makeUserService = (deps: UserServiceDeps) => {
  const {
    userRepository,
    refreshTokenRepository,
    financialPeriodRepository,
    seedDefaultPreferences,
    hashPassword,
    tokens,
    validations,
  } = deps;

  const issueTokenPair = async (userId: string) => {
    const accessToken = tokens.generateAccessToken(userId);
    const refreshTokenValue = tokens.generateRefreshToken();
    const hashedRefreshToken = tokens.hashRefreshToken(refreshTokenValue);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await refreshTokenRepository.create({
      userId,
      token: hashedRefreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken: refreshTokenValue };
  };

  const createUser = async ({ name, email, password }: CreateUserInput) => {
    await validations.ensureEmailNotExists(email);

    const hashedPassword = await hashPassword(password);

    const user = await userRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    try {
      await seedDefaultPreferences(user.id);
    } catch (error) {
      logger.error('Erro ao criar categorias padrão para o usuário', error as Error);
    }

    const tokenPair = await issueTokenPair(user.id);
    return { user, ...tokenPair };
  };

  const createSession = async ({ email, password }: CreateSessionInput) => {
    const user = await validations.validateCreateSession(email, password);
    const tokenPair = await issueTokenPair(user.id);
    return { user, ...tokenPair };
  };

  const createGoogleSession = async (idToken: string) => {
    const user = await validations.validateGoogleSession(idToken);
    const tokenPair = await issueTokenPair(user.id);
    return { user, ...tokenPair };
  };

  const refreshToken = async (refreshTokenValue: string) => {
    const hashedToken = tokens.hashRefreshToken(refreshTokenValue);
    const matchingToken = await refreshTokenRepository.findValidToken(hashedToken);

    if (!matchingToken) {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    const user = await userRepository.findById(matchingToken.userId);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const newAccessToken = tokens.generateAccessToken(user.id);

    return {
      user,
      accessToken: newAccessToken,
    };
  };

  const revokeRefreshToken = async (userId: string, refreshTokenValue: string) => {
    const hashedToken = tokens.hashRefreshToken(refreshTokenValue);
    const matchingToken = await refreshTokenRepository.findByToken(hashedToken);

    if (!matchingToken || matchingToken.userId !== userId) {
      throw new NotFoundError('Refresh token não encontrado');
    }

    await refreshTokenRepository.delete(matchingToken.id);

    return { success: true };
  };

  const updateFinancialPeriod = async (
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

  const updateIncomeAndPeriod = async (
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

  const updateProfile = async (
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

  return {
    createUser,
    createSession,
    createGoogleSession,
    refreshToken,
    revokeRefreshToken,
    updateFinancialPeriod,
    updateIncomeAndPeriod,
    updateProfile,
  };
};

// Composition root: instância default com os singletons reais.
export const userService = makeUserService({
  userRepository,
  refreshTokenRepository,
  financialPeriodRepository,
  seedDefaultPreferences: createDefaultPreferencesForUser,
  hashPassword: hash,
  tokens: {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
  },
  validations: {
    ensureEmailNotExists,
    validateCreateSession,
    validateGoogleSession,
  },
});
