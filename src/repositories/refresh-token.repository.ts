import { and, eq, gte } from "drizzle-orm";
import { db } from "../db";
import { refreshTokens, type NewRefreshToken, type RefreshToken } from "../db/schema";
import type { IRefreshTokenRepository } from "./interfaces/IRefreshTokenRepository";

export const refreshTokenRepository = {
  async create(tokenData: Omit<NewRefreshToken, "id" | "createdAt">): Promise<RefreshToken> {
    const [token] = await db.insert(refreshTokens).values(tokenData).returning();
    if (!token) throw new Error("Falha ao criar refresh token");
    return token;
  },

  async findByToken(hashedToken: string): Promise<RefreshToken | null> {
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, hashedToken))
      .limit(1);
    return token ?? null;
  },

  async findValidToken(hashedToken: string): Promise<RefreshToken | null> {
    const now = new Date();
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, hashedToken), gte(refreshTokens.expiresAt, now)))
      .limit(1);
    return token ?? null;
  },

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return db.select().from(refreshTokens).where(eq(refreshTokens.userId, userId));
  },

  async delete(tokenId: string): Promise<boolean> {
    const result = await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId)).returning();
    return result.length > 0;
  },

  async deleteByUserId(userId: string): Promise<number> {
    const result = await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId)).returning();
    return result.length;
  },

  async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await db.delete(refreshTokens).where(gte(refreshTokens.expiresAt, now)).returning();
    return result.length;
  },

  async deleteByToken(hashedToken: string): Promise<boolean> {
    const result = await db.delete(refreshTokens).where(eq(refreshTokens.token, hashedToken)).returning();
    return result.length > 0;
  },

  async findAllValid(): Promise<RefreshToken[]> {
    const now = new Date();
    return db.select().from(refreshTokens).where(gte(refreshTokens.expiresAt, now));
  },
} satisfies IRefreshTokenRepository;

export type { IRefreshTokenRepository };
