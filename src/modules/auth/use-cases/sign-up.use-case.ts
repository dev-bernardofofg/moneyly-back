import { hash } from '../../../core/helpers/bcrypt';
import { logger } from '../../../core/lib/logger';
import { createDefaultPreferencesForUser } from '../../../infra/db/seed';
import { userRepository } from '../../user';
import { issueTokenPair } from '../services/issue-token-pair';
import { ensureEmailNotExists } from '../validations/session.validation';
import type { CreateUserInput } from '../schemas/auth.schema';

export const signUpUseCase = async ({ name, email, password }: CreateUserInput) => {
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
