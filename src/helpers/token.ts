import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env';

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (): string => {
  return randomBytes(64).toString('hex');
};

// HMAC-SHA256 com JWT_SECRET como pepper. Determinístico → permite
// lookup direto por índice. Refresh tokens já são 512 bits de entropia
// (randomBytes), não precisam de slow-hash tipo bcrypt.
export const hashRefreshToken = (token: string): string => {
  return createHmac('sha256', env.JWT_SECRET).update(token).digest('hex');
};

export const verifyRefreshToken = (token: string, hashedToken: string): boolean => {
  const expected = hashRefreshToken(token);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hashedToken, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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
