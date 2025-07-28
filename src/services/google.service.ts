import { UserRepository } from "../repositories/user.repository";
import { HttpError } from "../validations/errors";
import { verifyGoogleToken } from "../validations/google.validation";

export const authenticateWithGoogle = async (idToken: string) => {
  try {
    // Verificar o token do Google
    const googleUser = await verifyGoogleToken(idToken);

    // Verificar se o usuário já existe pelo Google ID
    let user = await UserRepository.findByGoogleId(googleUser.sub);

    if (!user) {
      // Verificar se existe um usuário com o mesmo email
      user = await UserRepository.findByEmail(googleUser.email);

      if (user) {
        // Se existe usuário com o email, mas sem Google ID, atualizar
        user = await UserRepository.updateGoogleInfo(user.id, {
          googleId: googleUser.sub,
          avatar: googleUser.picture,
        });
      } else {
        // Criar novo usuário
        user = await UserRepository.create({
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.sub,
          avatar: googleUser.picture,
        });
      }
    }

    return user;
  } catch (error) {
    throw new HttpError(401, "Falha na autenticação com Google");
  }
};
