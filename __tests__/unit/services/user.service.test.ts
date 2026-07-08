/**
 * Unit tests for the user service (factory with injected dependencies).
 */

import { randomUUID } from 'crypto';
import { makeUserService, type UserServiceDeps } from '../../../src/services/user.service';
import { HttpError } from '../../../src/validations/errors';

const buildDeps = () => {
  const deps = {
    userRepository: {
      create: jest.fn(),
      findById: jest.fn(),
      updateMonthlyIncome: jest.fn(),
      updateFinancialPeriod: jest.fn(),
      updateIncomeAndPeriod: jest.fn(),
    },
    refreshTokenRepository: {
      create: jest.fn(),
      findByToken: jest.fn(),
      findValidToken: jest.fn(),
      delete: jest.fn(),
    },
    financialPeriodRepository: {
      deactivatePeriods: jest.fn(),
    },
    seedDefaultPreferences: jest.fn().mockResolvedValue([]),
    hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    tokens: {
      generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      hashRefreshToken: jest.fn().mockReturnValue('hashed-refresh-token'),
    },
    validations: {
      ensureEmailNotExists: jest.fn(),
      validateCreateSession: jest.fn(),
      validateGoogleSession: jest.fn(),
    },
  };
  return deps as unknown as UserServiceDeps & typeof deps;
};

describe('user service', () => {
  describe('createUser', () => {
    const input = { name: 'John Doe', email: 'john@example.com', password: 'password123' };

    it('creates a user, seeds preferences and issues a token pair', async () => {
      const deps = buildDeps();
      const userId = randomUUID();
      deps.userRepository.create.mockResolvedValue({ id: userId, ...input });
      deps.refreshTokenRepository.create.mockResolvedValue({ id: randomUUID() });

      const service = makeUserService(deps);
      const result = await service.createUser(input);

      expect(deps.validations.ensureEmailNotExists).toHaveBeenCalledWith(input.email);
      expect(deps.hashPassword).toHaveBeenCalledWith(input.password);
      expect(deps.userRepository.create).toHaveBeenCalledWith({
        name: input.name,
        email: input.email,
        password: 'hashed-password',
      });
      expect(deps.seedDefaultPreferences).toHaveBeenCalledWith(userId);
      expect(deps.refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, token: 'hashed-refresh-token' })
      );
      expect(result.user.id).toBe(userId);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('throws when the email already exists', async () => {
      const deps = buildDeps();
      deps.validations.ensureEmailNotExists.mockRejectedValue(
        new HttpError(409, 'Email já cadastrado')
      );

      const service = makeUserService(deps);

      await expect(service.createUser(input)).rejects.toMatchObject({
        status: 409,
        message: 'Email já cadastrado',
      });
      expect(deps.userRepository.create).not.toHaveBeenCalled();
    });

    it('does not fail signup when seeding default preferences fails', async () => {
      const deps = buildDeps();
      deps.userRepository.create.mockResolvedValue({ id: 'u1' });
      deps.refreshTokenRepository.create.mockResolvedValue({ id: 'rt1' });
      deps.seedDefaultPreferences.mockRejectedValue(new Error('seed down'));

      const service = makeUserService(deps);
      const result = await service.createUser(input);

      expect(result.accessToken).toBe('mock-access-token');
    });
  });

  describe('refreshToken', () => {
    it('rotates the access token for a valid refresh token', async () => {
      const deps = buildDeps();
      deps.refreshTokenRepository.findValidToken.mockResolvedValue({ id: 'rt1', userId: 'u1' });
      deps.userRepository.findById.mockResolvedValue({ id: 'u1' });

      const service = makeUserService(deps);
      const result = await service.refreshToken('raw-token');

      expect(deps.tokens.hashRefreshToken).toHaveBeenCalledWith('raw-token');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.id).toBe('u1');
    });

    it('rejects an invalid or expired refresh token with 401', async () => {
      const deps = buildDeps();
      deps.refreshTokenRepository.findValidToken.mockResolvedValue(null);

      const service = makeUserService(deps);

      await expect(service.refreshToken('bad')).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('revokeRefreshToken', () => {
    it('deletes the matching token of the same user', async () => {
      const deps = buildDeps();
      deps.refreshTokenRepository.findByToken.mockResolvedValue({ id: 'rt1', userId: 'u1' });
      deps.refreshTokenRepository.delete.mockResolvedValue(true);

      const service = makeUserService(deps);
      const result = await service.revokeRefreshToken('u1', 'raw');

      expect(deps.refreshTokenRepository.delete).toHaveBeenCalledWith('rt1');
      expect(result).toEqual({ success: true });
    });

    it('rejects when the token belongs to another user', async () => {
      const deps = buildDeps();
      deps.refreshTokenRepository.findByToken.mockResolvedValue({ id: 'rt1', userId: 'other' });

      const service = makeUserService(deps);

      await expect(service.revokeRefreshToken('u1', 'raw')).rejects.toMatchObject({ status: 404 });
      expect(deps.refreshTokenRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateFinancialPeriod / updateIncomeAndPeriod', () => {
    it('updates the period and deactivates stored periods', async () => {
      const deps = buildDeps();
      deps.userRepository.updateFinancialPeriod.mockResolvedValue({ id: 'u1' });

      const service = makeUserService(deps);
      await service.updateFinancialPeriod('u1', 5, 4);

      expect(deps.userRepository.updateFinancialPeriod).toHaveBeenCalledWith('u1', 5, 4);
      expect(deps.financialPeriodRepository.deactivatePeriods).toHaveBeenCalledWith('u1');
    });

    it('updates income and period together and deactivates stored periods', async () => {
      const deps = buildDeps();
      deps.userRepository.updateIncomeAndPeriod.mockResolvedValue({ id: 'u1' });

      const service = makeUserService(deps);
      await service.updateIncomeAndPeriod('u1', 5000, 5, 4);

      expect(deps.userRepository.updateIncomeAndPeriod).toHaveBeenCalledWith('u1', 5000, 5, 4);
      expect(deps.financialPeriodRepository.deactivatePeriods).toHaveBeenCalledWith('u1');
    });

    it('throws 404 when the user does not exist', async () => {
      const deps = buildDeps();
      deps.userRepository.updateFinancialPeriod.mockResolvedValue(null);

      const service = makeUserService(deps);

      await expect(service.updateFinancialPeriod('ghost', 1, 31)).rejects.toMatchObject({
        status: 404,
      });
      expect(deps.financialPeriodRepository.deactivatePeriods).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    const baseUser = {
      id: 'u1',
      name: 'John',
      email: 'j@x.com',
      monthlyIncome: '1000',
      financialDayStart: 1,
      financialDayEnd: 31,
      firstAccess: true,
    };

    it('updates only the monthly income when provided', async () => {
      const deps = buildDeps();
      deps.userRepository.updateMonthlyIncome.mockResolvedValue({
        ...baseUser,
        monthlyIncome: '2000',
      });

      const service = makeUserService(deps);
      const result = await service.updateProfile(baseUser, { monthlyIncome: 2000 });

      expect(deps.userRepository.updateMonthlyIncome).toHaveBeenCalledWith('u1', 2000);
      expect(deps.userRepository.updateFinancialPeriod).not.toHaveBeenCalled();
      expect(result.monthlyIncome).toBe('2000');
    });

    it('updates the financial period only when both bounds are provided', async () => {
      const deps = buildDeps();

      const service = makeUserService(deps);
      await service.updateProfile(baseUser, { financialDayStart: 5 });

      expect(deps.userRepository.updateFinancialPeriod).not.toHaveBeenCalled();
    });
  });
});
