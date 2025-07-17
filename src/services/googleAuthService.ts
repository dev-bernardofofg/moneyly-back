import { OAuth2Client } from "google-auth-library";
import { createDefaultCategoriesForUser } from "../db/seed";
import { env } from "../env";
import { UserRepository } from "../repositories/userRepository";

interface GoogleUserInfo {
  sub: string; // Google ID
  name: string;
  email: string;
  picture: string;
}

export class GoogleAuthService {
  private static googleClient = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET
  );

  /**
   * Verifica e valida o token ID do Google
   */
  static async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error("Token inválido");
      }

      return {
        sub: payload.sub,
        name: payload.name || "",
        email: payload.email || "",
        picture: payload.picture || "",
      };
    } catch (error) {
      throw new Error("Falha na verificação do token Google");
    }
  }

  /**
   * Autentica ou cria um usuário via Google OAuth
   */
  static async authenticateWithGoogle(idToken: string) {
    try {
      // Verificar o token do Google
      const googleUser = await this.verifyGoogleToken(idToken);

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

          // Criar categorias padrão para o novo usuário
          try {
            await createDefaultCategoriesForUser(user.id);
          } catch (categoryError) {
            console.error("Erro ao criar categorias padrão:", categoryError);
            // Não falhar o registro se as categorias não puderem ser criadas
          }
        }
      }

      return user;
    } catch (error) {
      console.error("Erro na autenticação Google:", error);
      throw error;
    }
  }
}
