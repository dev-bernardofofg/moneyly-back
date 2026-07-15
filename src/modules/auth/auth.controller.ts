import type { Request, Response } from 'express';
import { mapUserResponse } from './helpers/mappers';
import { ResponseHandler } from '../../core/helpers/response-handler';
import { asyncHandler } from '../../core/middlewares/async-handler';
import type { AuthRequest } from './middlewares/auth';
import { BadRequestError } from '../../services/errors';
import { googleSignInUseCase } from './use-cases/google-sign-in.use-case';
import { logoutUseCase } from './use-cases/logout.use-case';
import { refreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { signInUseCase } from './use-cases/sign-in.use-case';
import { signUpUseCase } from './use-cases/sign-up.use-case';

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await signUpUseCase(req.body);
  return ResponseHandler.created(
    res,
    { user: mapUserResponse(user), accessToken, refreshToken },
    'Usuário criado com sucesso'
  );
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await signInUseCase(req.body);
  return ResponseHandler.success(
    res,
    { user: mapUserResponse(user), accessToken, refreshToken },
    'Login realizado com sucesso'
  );
});

export const createGoogleSession = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;
  const { user, accessToken, refreshToken } = await googleSignInUseCase(idToken);
  return ResponseHandler.success(
    res,
    { user: mapUserResponse(user, true), accessToken, refreshToken },
    'Login com Google realizado com sucesso'
  );
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: refreshTokenValue } = req.body;
  if (!refreshTokenValue) throw new BadRequestError('Refresh token não fornecido');

  const { user, accessToken } = await refreshTokenUseCase(refreshTokenValue);
  return ResponseHandler.success(
    res,
    { user: mapUserResponse(user), accessToken },
    'Token renovado com sucesso'
  );
});

export const logout = asyncHandler<AuthRequest>(async (req, res) => {
  const { refreshToken: refreshTokenValue } = req.body;
  if (!refreshTokenValue) throw new BadRequestError('Refresh token não fornecido');

  await logoutUseCase(req.user.id, refreshTokenValue);
  return ResponseHandler.success(res, { success: true }, 'Logout realizado com sucesso');
});
