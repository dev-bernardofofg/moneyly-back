import type { NextFunction, Request, Response } from 'express';
import { isHttpError } from '../helpers/errors';
import { mapUserResponse } from '../helpers/mappers';
import { ResponseHandler } from '../helpers/response-handler';
import type { AuthenticatedRequest } from '../middlewares/auth';
import {
  createGoogleSessionService,
  createSessionService,
  createUserService,
  refreshTokenService,
  revokeRefreshTokenService,
} from '../services/user.service';

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, accessToken, refreshToken } = await createUserService(req.body);
    return ResponseHandler.created(
      res,
      { user: mapUserResponse(user), accessToken, refreshToken },
      'Usuário criado com sucesso'
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      'Não foi possível criar sua conta. Verifique se o email já não está cadastrado e tente novamente.',
      error
    );
  }
};

export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, accessToken, refreshToken } = await createSessionService(req.body);
    return ResponseHandler.success(
      res,
      { user: mapUserResponse(user), accessToken, refreshToken },
      'Login realizado com sucesso'
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      'Não foi possível fazer login. Verifique suas credenciais e tente novamente.',
      error
    );
  }
};

export const createGoogleSession = async (req: Request, res: Response, next: NextFunction) => {
  const { idToken } = req.body;
  try {
    const { user, accessToken, refreshToken } = await createGoogleSessionService(idToken);
    return ResponseHandler.success(
      res,
      { user: mapUserResponse(user, true), accessToken, refreshToken },
      'Login com Google realizado com sucesso'
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.unauthorized(res, 'Falha na autenticação com Google');
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken: refreshTokenValue } = req.body;
  if (!refreshTokenValue) {
    return ResponseHandler.badRequest(res, 'Refresh token não fornecido');
  }
  try {
    const { user, accessToken } = await refreshTokenService(refreshTokenValue);
    return ResponseHandler.success(
      res,
      { user: mapUserResponse(user), accessToken },
      'Token renovado com sucesso'
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.unauthorized(res, 'Refresh token inválido ou expirado');
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { user } = req;
  const { refreshToken: refreshTokenValue } = req.body;

  if (!user) return ResponseHandler.unauthorized(res, 'Usuário não autenticado');
  if (!refreshTokenValue) return ResponseHandler.badRequest(res, 'Refresh token não fornecido');

  try {
    await revokeRefreshTokenService(user.id, refreshTokenValue);
    return ResponseHandler.success(res, { success: true }, 'Logout realizado com sucesso');
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, 'Não foi possível fazer logout', error);
  }
};
