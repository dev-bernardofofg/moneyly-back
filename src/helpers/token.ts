import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { env } from '../env';
import { hash, compare } from './bcrypt';

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (): string => {
  return randomBytes(64).toString('hex');
};

export const hashRefreshToken = async (token: string): Promise<string> => {
  return await hash(token);
};

export const verifyRefreshToken = async (token: string, hashedToken: string): Promise<boolean> => {
  return await compare(token, hashedToken);
};

export const verifyAccessToken = (token: string): { userId: string } => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    !('userId' in decoded) ||
    typeof decoded.userId !== 'string'
  ) {
    throw new Error('Token payload inválido');
  }
  return { userId: decoded.userId };
};
