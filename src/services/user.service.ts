import bcrypt from "bcryptjs";
import { createDefaultPreferencesForUser } from "../db/seed";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "../helpers/token";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { UserRepository } from "../repositories/user.repository";
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

  const user = await UserRepository.create({
    name,
    email,
    password: hashedPassword,
  });

  // Criar preferências de categorias padrão para o novo usuário
  try {
    await createDefaultPreferencesForUser(user.id);
  } catch (error) {
    // Log do erro, mas não impede a criação do usuário
    console.error("⚠️ Erro ao criar categorias padrão para o usuário:", error);
  }

  // Gerar access token e refresh token
  const accessToken = generateAccessToken(user.id);
  const refreshTokenValue = generateRefreshToken();
  const hashedRefreshToken = await hashRefreshToken(refreshTokenValue);

  // Calcular data de expiração (7 dias)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Salvar refresh token no banco
  await RefreshTokenRepository.create({
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
  await RefreshTokenRepository.create({
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
  await RefreshTokenRepository.create({
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
  // Buscar todos os refresh tokens válidos do usuário e verificar um por um
  // (Não podemos fazer lookup direto porque bcrypt usa salt único)
  // Em produção, considere usar uma abordagem diferente (ex: token com ID + secret)

  // Buscar todos os tokens válidos (não expirados)
  // Como não podemos fazer lookup direto, vamos precisar buscar todos e comparar
  // Para otimizar, vamos usar uma abordagem onde o token tem userId incorporado
  // ou usar uma tabela de lookup diferente

  // Por enquanto, vamos buscar tokens válidos ordenados por data e comparar
  // NOTA: Em produção com muitos tokens, isso pode ser lento
  // Considere usar uma estrutura de token com ID separado para lookup rápido

  const allTokens = await RefreshTokenRepository.findAllValid();

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
  const user = await UserRepository.findById(matchingToken.userId);

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
  const userTokens = await RefreshTokenRepository.findByUserId(userId);

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
  await RefreshTokenRepository.delete(matchingToken.id);

  return { success: true };
};

// Exemplo de serviço que recebe o usuário como parâmetro
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
    const updated = await UserRepository.updateMonthlyIncome(
      user.id,
      data.monthlyIncome
    );
    if (updated) updatedUser = updated;
  }

  if (
    data.financialDayStart !== undefined &&
    data.financialDayEnd !== undefined
  ) {
    const updated = await UserRepository.updateFinancialPeriod(
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
