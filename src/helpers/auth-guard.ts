/**
 * Helper para garantir que o usuário está autenticado
 * Lança erro se req.user não existir
 */

import type { AuthenticatedUser } from "../types/auth.types";

export function ensureAuthenticated(
  user: AuthenticatedUser | undefined
): AuthenticatedUser {
  if (!user) {
    throw new Error("Usuário não autenticado");
  }
  return user;
}
