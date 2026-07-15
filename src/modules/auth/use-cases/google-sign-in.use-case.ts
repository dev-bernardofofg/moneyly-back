import { issueTokenPair } from '../services/issue-token-pair';
import { validateGoogleSession } from '../validations/session.validation';

export const googleSignInUseCase = async (idToken: string) => {
  const user = await validateGoogleSession(idToken);
  const tokens = await issueTokenPair(user.id);
  return { user, ...tokens };
};
