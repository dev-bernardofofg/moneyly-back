import { createDefaultPreferencesForUser } from "../db/seed";
import { logger } from "../lib/logger";
import { userRepository } from "../repositories/user.repository";
import { HttpError } from "../validations/errors";
import { verifyGoogleToken } from "../validations/google.validation";

export const authenticateWithGoogle = async (idToken: string) => {
  try {
    const googleUser = await verifyGoogleToken(idToken);

    let user = await userRepository.findByGoogleId(googleUser.sub);

    if (!user) {
      user = await userRepository.findByEmail(googleUser.email);

      if (user) {
        user = await userRepository.updateGoogleInfo(user.id, {
          googleId: googleUser.sub,
          avatar: googleUser.picture,
        });
      } else {
        user = await userRepository.create({
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.sub,
          avatar: googleUser.picture,
        });

        try {
          await createDefaultPreferencesForUser(user.id);
        } catch (error) {
          logger.error("Erro ao criar categorias padrão para o usuário Google", error as Error);
        }
      }
    }

    return user;
  } catch (error) {
    throw new HttpError(401, "Falha na autenticação com Google");
  }
};
