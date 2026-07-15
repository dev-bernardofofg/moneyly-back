import type { User } from '../../infra/db/schema';

export type AuthenticatedUser = Omit<User, 'password'>;

export interface JWTPayload {
  userId: string;
}
