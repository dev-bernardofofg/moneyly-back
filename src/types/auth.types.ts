/**
 * Tipos relacionados à autenticação
 */

import type { User } from "../db/schema";

// Tipo para o usuário autenticado (sem senha)
export type AuthenticatedUser = Omit<User, "password">;

// Tipo para dados do usuário no token JWT
export interface JWTPayload {
  userId: string;
}

// Tipo para resposta de autenticação
export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    googleId?: string | null;
    avatar?: string | null;
    monthlyIncome: string | number;
    financialDayStart: number;
    financialDayEnd: number;
    firstAccess: boolean | null;
    createdAt: Date;
  };
  token: string;
}
