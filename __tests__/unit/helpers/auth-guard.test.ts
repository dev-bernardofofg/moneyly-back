/**
 * Testes unitários para auth-guard helper
 */

import { ensureAuthenticated } from "../../../src/helpers/auth-guard";
import type { AuthenticatedUser } from "../../../src/types/auth.types";

describe("AuthGuard", () => {
  describe("ensureAuthenticated", () => {
    const mockUser: AuthenticatedUser = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      googleId: null,
      avatar: null,
      monthlyIncome: "0",
      financialDayStart: 1,
      financialDayEnd: 31,
      firstAccess: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("deve retornar usuário quando está autenticado", () => {
      const result = ensureAuthenticated(mockUser);

      expect(result).toEqual(mockUser);
      expect(result.id).toBe("user-123");
      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
    });

    it("deve lançar erro quando usuário não está definido", () => {
      expect(() => {
        ensureAuthenticated(undefined);
      }).toThrow("Usuário não autenticado");
    });

    it("deve preservar todas as propriedades do usuário", () => {
      const userWithExtra = {
        ...mockUser,
        customField: "custom value",
      } as AuthenticatedUser;

      const result = ensureAuthenticated(userWithExtra);

      expect(result).toEqual(userWithExtra);
    });

    it("deve funcionar com type guard", () => {
      const maybeUser: AuthenticatedUser | undefined = mockUser;

      // Antes do guard, TypeScript sabe que pode ser undefined
      // Após o guard, TypeScript sabe que é AuthenticatedUser
      const user = ensureAuthenticated(maybeUser);

      // Se chegou aqui, user é garantidamente AuthenticatedUser
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
    });
  });
});
