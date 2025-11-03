/**
 * Testes unitários para token helper
 */

import jwt from "jsonwebtoken";
import { env } from "../../../src/env";
import { generateToken } from "../../../src/helpers/token";

describe("TokenHelper", () => {
  describe("generateToken", () => {
    const mockUserId = "user-123";

    it("deve gerar um token JWT válido", () => {
      const token = generateToken(mockUserId);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("deve incluir userId no payload do token", () => {
      const token = generateToken(mockUserId);
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string;
      };

      expect(decoded.userId).toBe(mockUserId);
    });

    it("deve gerar token com expiração de 15 minutos", () => {
      const token = generateToken(mockUserId);
      const decoded = jwt.decode(token) as {
        userId: string;
        iat: number;
        exp: number;
      };

      expect(decoded).toHaveProperty("exp");
      expect(decoded).toHaveProperty("iat");

      const expiresIn = decoded.exp - decoded.iat;
      const fifteenMinutesInSeconds = 15 * 60; // 900 segundos

      expect(expiresIn).toBe(fifteenMinutesInSeconds);
    });

    it("deve gerar tokens diferentes para diferentes userIds", () => {
      const token1 = generateToken("user-1");
      const token2 = generateToken("user-2");

      expect(token1).not.toBe(token2);

      const decoded1 = jwt.verify(token1, env.JWT_SECRET) as {
        userId: string;
      };
      const decoded2 = jwt.verify(token2, env.JWT_SECRET) as {
        userId: string;
      };

      expect(decoded1.userId).toBe("user-1");
      expect(decoded2.userId).toBe("user-2");
    });

    it("deve ser verificável com JWT_SECRET", () => {
      const token = generateToken(mockUserId);

      expect(() => {
        jwt.verify(token, env.JWT_SECRET);
      }).not.toThrow();
    });

    it("deve falhar verificação com secret incorreto", () => {
      const token = generateToken(mockUserId);

      expect(() => {
        jwt.verify(token, "wrong-secret");
      }).toThrow();
    });

    it("deve gerar tokens únicos mesmo para mesmo userId", () => {
      // Tokens gerados em momentos diferentes devem ser diferentes (iat diferente)
      const token1 = generateToken(mockUserId);

      // Pequeno delay para garantir iat diferente
      const waitMs = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      return waitMs(1000).then(() => {
        const token2 = generateToken(mockUserId);

        expect(token1).not.toBe(token2);

        const decoded1 = jwt.decode(token1) as { iat: number };
        const decoded2 = jwt.decode(token2) as { iat: number };

        expect(decoded2.iat).toBeGreaterThan(decoded1.iat);
      });
    });
  });
});
