import { OAuth2Client } from "google-auth-library";
import { env } from "../env";
import { HttpError } from "./errors";

interface GoogleUserInfo {
  sub: string; // Google ID
  name: string;
  email: string;
  picture: string;
}

export const googleOAuth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET
);

export const verifyGoogleToken = async (
  idToken: string
): Promise<GoogleUserInfo> => {
  try {
    const ticket = await googleOAuth2Client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new HttpError(401, "Token inválido");
    }

    return {
      sub: payload.sub,
      name: payload.name || "",
      email: payload.email || "",
      picture: payload.picture || "",
    };
  } catch (error) {
    throw new HttpError(401, "Falha na verificação do token Google");
  }
};
