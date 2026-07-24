import { issueTokenPair } from '../services/issue-token-pair';
import { validateCreateSession } from '../validations/session.validation';
import type { CreateSessionInput } from '../schemas/auth.schema';

export const signInUseCase = async ({ email, password }: CreateSessionInput) => {
  const user = await validateCreateSession(email, password);
  const tokens = await issueTokenPair(user.id);
  return { user, ...tokens };
};
