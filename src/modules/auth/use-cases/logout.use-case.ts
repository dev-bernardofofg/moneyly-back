import { hashRefreshToken } from '@core/helpers/token';
import { NotFoundError } from '@core/errors';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';

export const logoutUseCase = async (userId: string, refreshToken: string) => {
  const hashedToken = hashRefreshToken(refreshToken);
  const matchingToken = await refreshTokenRepository.findByToken(hashedToken);

  if (!matchingToken || matchingToken.userId !== userId) {
    throw new NotFoundError('Refresh token não encontrado');
  }

  await refreshTokenRepository.delete(matchingToken.id);

  return { success: true };
};
