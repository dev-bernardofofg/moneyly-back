import type { NewRefreshToken, RefreshToken } from '../../db/schema';

export interface IRefreshTokenRepository {
  create(tokenData: Omit<NewRefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken>;
  findByToken(hashedToken: string): Promise<RefreshToken | null>;
  findValidToken(hashedToken: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken[]>;
  delete(tokenId: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  deleteExpired(): Promise<number>;
  deleteByToken(hashedToken: string): Promise<boolean>;
  findAllValid(): Promise<RefreshToken[]>;
}
