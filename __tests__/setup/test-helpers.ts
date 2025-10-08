/**
 * Helpers para testes
 */

import type { User } from "../../src/db/schema";
import { generateToken } from "../../src/helpers/token";

/**
 * Cria um usuário de teste
 */
export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    password: "$2a$10$test.hash.password",
    googleId: null,
    avatar: null,
    monthlyIncome: "5000.00",
    financialDayStart: 1,
    financialDayEnd: 31,
    firstAccess: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Gera um token JWT de teste
 */
export function createTestToken(userId: string = "test-user-id"): string {
  return generateToken(userId);
}

/**
 * Headers de autenticação para testes
 */
export function authHeaders(userId?: string) {
  const token = createTestToken(userId);
  return {
    Authorization: `Bearer ${token}`,
  };
}
