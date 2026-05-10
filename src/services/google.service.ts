import { createDefaultPreferencesForUser } from "../db/seed";
import { logger } from "../lib/logger";
import { userRepository } from "../repositories/user.repository";
import { HttpError } from "../validations/errors";
import { verifyGoogleToken } from "../validations/google.validation";

export const authenticateWithGoogle = async (idToken: string) => {
  try {
    // Verificar o token do Google
    const googleUser = await verifyGoogleToken(idToken);

    // Verificar se o usuário já existe pelo Google ID
    let user = await userRepository.findByGoogleId(googleUser.sub);

    if (!user) {
      // Verificar se existe um usuário com o mesmo email
      user = await userRepository.findByEmail(googleUser.email);

      if (user) {
        // Se existe usuário com o email, mas sem Google ID, atualizar
        user = await userRepository.updateGoogleInfo(user.id, {
          googleId: googleUser.sub,
          avatar: googleUser.picture,
        });
      } else {
        // Criar novo usuário
        user = await userRepository.create({
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.sub,
          avatar: googleUser.picture,
        });

        // Criar preferências de categorias padrão para o novo usuário
        try {
          await createDefaultPreferencesForUser(user.id);
        } catch (error) {
          // Log do erro, mas não impede a criação do usuário
          logger.error("Erro ao criar categorias padrão para o usuário Google", error as Error);
        }
      }
    }

    return user;
  } catch (error) {
    throw new HttpError(401, "Falha na autenticação com Google");
  }
};
