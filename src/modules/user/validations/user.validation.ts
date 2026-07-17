import { userRepository } from '../repositories/user.repository';
import { HttpError } from '../../../core/errors/http-error';

export const requireUser = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new HttpError(401, 'Usuário não autenticado', { userId });
  return user;
};
