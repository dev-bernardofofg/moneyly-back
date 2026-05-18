/**
 * Testes unitários para token helper
 */

import jwt from "jsonwebtoken";
import { env } from "../../../src/env";
import { generateAccessToken } from "../../../src/helpers/token";

describe("TokenHelper", () => {
  describe("generateAccessToken", () => {
    const mockUserId = "user-123";

    it("generates a valid JWT token", () => {
      const token = generateAccessToken(mockUserId);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("includes userId in the token payload", () => {
      const token = generateAccessToken(mockUserId);
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string;
      };

      expect(decoded.userId).toBe(mockUserId);
    });

    it("generates a token with 15-minute expiration", () => {
      const token = generateAccessToken(mockUserId);
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

    it("generates different tokens for different userIds", () => {
      const token1 = generateAccessToken("user-1");
      const token2 = generateAccessToken("user-2");

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

    it("is verifiable with JWT_SECRET", () => {
      const token = generateAccessToken(mockUserId);

      expect(() => {
        jwt.verify(token, env.JWT_SECRET);
      }).not.toThrow();
    });

    it("fails verification with an incorrect secret", () => {
      const token = generateAccessToken(mockUserId);

      expect(() => {
        jwt.verify(token, "wrong-secret");
      }).toThrow();
    });

    it("generates unique tokens even for the same userId", () => {
      // Tokens gerados em momentos diferentes devem ser diferentes (iat diferente)
      const token1 = generateAccessToken(mockUserId);

      // Pequeno delay para garantir iat diferente
      const waitMs = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      return waitMs(1000).then(() => {
        const token2 = generateAccessToken(mockUserId);

        expect(token1).not.toBe(token2);

        const decoded1 = jwt.decode(token1) as { iat: number };
        const decoded2 = jwt.decode(token2) as { iat: number };

        expect(decoded2.iat).toBeGreaterThan(decoded1.iat);
      });
    });
  });
});
