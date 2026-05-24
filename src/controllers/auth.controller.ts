import type { Request, Response } from 'express';
import { mapUserResponse } from '../helpers/mappers';
import { ResponseHandler } from '../helpers/response-handler';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import { BadRequestError } from '../services/errors';
import {
  createGoogleSessionService,
  createSessionService,
  createUserService,
  refreshTokenService,
  revokeRefreshTokenService,
} from '../services/user.service';

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await createUserService(req.body);
  return ResponseHandler.created(
    res,
    { user: mapUserResponse(user), accessToken, refreshToken },
    'Usuário criado com sucesso'
  );
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await createSessionService(req.body);
  return ResponseHandler.success(
    res,
    { user: mapUserResponse(user), accessToken, refreshToken },
    'Login realizado com sucesso'
  );
});

export const createGoogleSession = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;
  const { user, accessToken, refreshToken } = await createGoogleSessionService(idToken);
  return ResponseHandler.success(
    res,
    { user: mapUserResponse(user, true), accessToken, refreshToken },
    'Login com Google realizado com sucesso'
  );
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: refreshTokenValue } = req.body;
  if (!refreshTokenValue) throw new BadRequestError('Refresh token não fornecido');

  const { user, accessToken } = await refreshTokenService(refreshTokenValue);
  return ResponseHandler.success(
    res,
    { user: mapUserResponse(user), accessToken },
    'Token renovado com sucesso'
  );
});

export const logout = asyncHandler<AuthRequest>(async (req, res) => {
  const { refreshToken: refreshTokenValue } = req.body;
  if (!refreshTokenValue) throw new BadRequestError('Refresh token não fornecido');

  await revokeRefreshTokenService(req.user.id, refreshTokenValue);
  return ResponseHandler.success(res, { success: true }, 'Logout realizado com sucesso');
});
