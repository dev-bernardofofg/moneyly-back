import { compare } from '../helpers/bcrypt';
import { userRepository } from '../repositories/user.repository';
import { authenticateWithGoogle } from '../services/google.service';
import { HttpError } from './errors';

export const ensureEmailNotExists = async (email: string) => {
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    throw new HttpError(409, 'Email já cadastrado');
  }
};

export const requireUser = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new HttpError(401, 'Usuário não autenticado', { userId });
  return user;
};

export const validateCreateSession = async (email: string, password: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new HttpError(404, 'Usuário não encontrado');
  }
  if (!user.password) {
    throw new HttpError(400, 'Conta não possui senha cadastrada');
  }

  const isMatch = await compare(password, user.password);
  if (!isMatch) {
    throw new HttpError(401, 'Senha inválida');
  }
  return user;
};

export const validateGoogleSession = async (idToken: string) => {
  const user = await authenticateWithGoogle(idToken);
  if (!user) {
    throw new HttpError(401, 'Falha na autenticação com Google');
  }
  return user;
};
