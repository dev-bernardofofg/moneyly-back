/**
 * Testes unitários para UserService
 */

import { UserRepository } from "../../../src/repositories/user.repository";
import { createUserService } from "../../../src/services/user.service";
import { HttpError } from "../../../src/validations/errors";

// Mock do repository
jest.mock("../../../src/repositories/user.repository");

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createUserService", () => {
    it("deve criar um usuário com sucesso", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user-id",
        ...userData,
        password: "hashed-password",
        googleId: null,
        avatar: null,
        monthlyIncome: "0",
        financialDayStart: 1,
        financialDayEnd: 31,
        firstAccess: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await createUserService(userData);

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("token");
      expect(result.user.id).toBe("user-id");
    });

    it("deve lançar erro se email já existe", async () => {
      const userData = {
        name: "John Doe",
        email: "existing@example.com",
        password: "password123",
      };

      (UserRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
      });

      await expect(createUserService(userData)).rejects.toThrow(HttpError);
      await expect(createUserService(userData)).rejects.toMatchObject({
        status: 409,
        message: "Email já cadastrado",
      });
    });
  });
});
