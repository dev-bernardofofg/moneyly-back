import type { User } from '../db/schema';

export type AuthenticatedUser = Omit<User, 'password'>;

export interface JWTPayload {
  userId: string;
}
