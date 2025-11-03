import { and, eq, gte } from "drizzle-orm";
import { db } from "../db";
import {
  refreshTokens,
  type NewRefreshToken,
  type RefreshToken,
} from "../db/schema";

/**
 * Repository para gerenciar refresh tokens
 */
export class RefreshTokenRepository {
  /**
   * Cria um novo refresh token
   */
  static async create(
    tokenData: Omit<NewRefreshToken, "id" | "createdAt">
  ): Promise<RefreshToken> {
    const [token] = await db
      .insert(refreshTokens)
      .values(tokenData)
      .returning();
    if (!token) throw new Error("Falha ao criar refresh token");
    return token;
  }

  /**
   * Busca um refresh token por token hasheado
   */
  static async findByToken(hashedToken: string): Promise<RefreshToken | null> {
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, hashedToken))
      .limit(1);

    return token || null;
  }

  /**
   * Busca um refresh token válido (não expirado) por token hasheado
   */
  static async findValidToken(
    hashedToken: string
  ): Promise<RefreshToken | null> {
    const now = new Date();
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, hashedToken),
          gte(refreshTokens.expiresAt, now)
        )
      )
      .limit(1);

    return token || null;
  }

  /**
   * Busca todos os refresh tokens de um usuário
   */
  static async findByUserId(userId: string): Promise<RefreshToken[]> {
    return await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
  }

  /**
   * Deleta um refresh token
   */
  static async delete(tokenId: string): Promise<boolean> {
    const result = await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.id, tokenId))
      .returning();

    return result.length > 0;
  }

  /**
   * Deleta todos os refresh tokens de um usuário
   */
  static async deleteByUserId(userId: string): Promise<number> {
    const result = await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId))
      .returning();

    return result.length;
  }

  /**
   * Deleta todos os refresh tokens expirados
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(refreshTokens)
      .where(gte(refreshTokens.expiresAt, now))
      .returning();

    return result.length;
  }

  /**
   * Deleta um refresh token por token hasheado
   */
  static async deleteByToken(hashedToken: string): Promise<boolean> {
    const result = await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.token, hashedToken))
      .returning();

    return result.length > 0;
  }

  /**
   * Busca todos os refresh tokens válidos (não expirados)
   * Usado para comparação quando não podemos fazer lookup direto
   */
  static async findAllValid(): Promise<RefreshToken[]> {
    const now = new Date();
    return await db
      .select()
      .from(refreshTokens)
      .where(gte(refreshTokens.expiresAt, now));
  }
}
