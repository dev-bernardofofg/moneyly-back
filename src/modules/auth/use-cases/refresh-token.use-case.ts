import { generateAccessToken, hashRefreshToken } from '@core/helpers/token';
import { NotFoundError, UnauthorizedError } from '@core/errors';
import { userRepository } from '@modules/user';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';

export const refreshTokenUseCase = async (refreshToken: string) => {
  const hashedToken = hashRefreshToken(refreshToken);
  const matchingToken = await refreshTokenRepository.findValidToken(hashedToken);

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
