import type { User } from "../db/schema";

// Tipo para o usuário autenticado (sem senha)
export type AuthenticatedUser = Omit<User, "password">;

// Tipo para dados do usuário no token JWT
export interface JWTPayload {
  userId: string;
}

