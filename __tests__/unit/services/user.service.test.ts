/**
 * Testes unitários para UserService
 */

import { randomUUID } from 'crypto';
import { refreshTokenRepository } from '../../../src/repositories/refresh-token.repository';
import { userRepository } from '../../../src/repositories/user.repository';
import { createUserService } from '../../../src/services/user.service';
import { HttpError } from '../../../src/validations/errors';

// Mock dos repositories e módulos
jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/repositories/refresh-token.repository');
jest.mock('../../../src/db/seed');
jest.mock('../../../src/helpers/token');

// Mock das funções de token e seed
const mockGenerateAccessToken = jest.fn(() => 'mock-access-token');
const mockGenerateRefreshToken = jest.fn(() => 'mock-refresh-token');
const mockHashRefreshToken = jest.fn(() => Promise.resolve('hashed-refresh-token'));
const mockCreateDefaultPreferencesForUser = jest.fn(() => Promise.resolve([]));

jest.mock('../../../src/helpers/token', () => ({
  generateAccessToken: () => mockGenerateAccessToken(),
  generateRefreshToken: () => mockGenerateRefreshToken(),
  hashRefreshToken: () => mockHashRefreshToken(),
}));

jest.mock('../../../src/db/seed', () => ({
  createDefaultPreferencesForUser: () => mockCreateDefaultPreferencesForUser(),
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserService', () => {
    it('creates a user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const mockUserId = randomUUID();
      const mockUser = {
        id: mockUserId,
        ...userData,
        password: 'hashed-password',
        googleId: null,
        avatar: null,
        monthlyIncome: '0',
        financialDayStart: 1,
        financialDayEnd: 31,
        firstAccess: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRefreshToken = {
        id: randomUUID(),
        userId: mockUserId,
        token: 'hashed-refresh-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);
      (refreshTokenRepository.create as jest.Mock).mockResolvedValue(mockRefreshToken);

      const result = await createUserService(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(mockUserId);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('throws an error if the email already exists', async () => {
      const userData = {
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'password123',
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      await expect(createUserService(userData)).rejects.toThrow(HttpError);
      await expect(createUserService(userData)).rejects.toMatchObject({
        status: 409,
        message: 'Email já cadastrado',
      });
    });
  });
});
