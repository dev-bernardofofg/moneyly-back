import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../../../core/helpers/token';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';

const REFRESH_TOKEN_TTL_DAYS = 7;

export const issueTokenPair = async (userId: string) => {
  const accessToken = generateAccessToken(userId);
  const refreshTokenValue = generateRefreshToken();
  const hashedRefreshToken = hashRefreshToken(refreshTokenValue);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await refreshTokenRepository.create({
    userId,
    token: hashedRefreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken: refreshTokenValue };
};
