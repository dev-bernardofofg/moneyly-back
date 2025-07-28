import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/user.repository";
import { authenticateWithGoogle } from "../services/google.service";
import { HttpError } from "./errors";

export const ensureEmailNotExists = async (email: string) => {
  const existingUser = await UserRepository.findByEmail(email);

  if (existingUser) {
    throw new HttpError(409, "Email já cadastrado");
  }
};

export const validateUserNotAuthenticated = async (userId: string) => {
  try {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new HttpError(401, "Usuário não autenticado", {
        userId,
      });
    }
    return user;
  } catch (error) {
    throw new HttpError(401, "Erro ao validar usuário", {
      userId,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};

export const validateCreateSession = async (
  email: string,
  password: string
) => {
  const user = await UserRepository.findByEmail(email);
  if (!user) {
    throw new HttpError(404, "Usuário não encontrado");
  }
  if (!user.password) {
    throw new HttpError(400, "Conta não possui senha cadastrada");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new HttpError(401, "Senha inválida");
  }
  return user;
};

export const validateGoogleSession = async (idToken: string) => {
  const user = await authenticateWithGoogle(idToken);
  if (!user) {
    throw new HttpError(401, "Falha na autenticação com Google");
  }
  return user;
};
