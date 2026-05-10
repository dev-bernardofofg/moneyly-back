import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { env } from "../env";
import bcrypt from "bcryptjs";

/**
 * Gera um access token (curta duração - 15 minutos)
 */
export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "15m" });
};

/**
 * Gera um refresh token aleatório (longa duração - 7 dias)
 */
export const generateRefreshToken = (): string => {
  return randomBytes(64).toString("hex");
};

/**
 * Hash do refresh token antes de salvar no banco
 */
export const hashRefreshToken = async (token: string): Promise<string> => {
  return await bcrypt.hash(token, 10);
};

/**
 * Verifica se o refresh token fornecido corresponde ao hash salvo
 */
export const verifyRefreshToken = async (
  token: string,
  hashedToken: string
): Promise<boolean> => {
  return await bcrypt.compare(token, hashedToken);
};

/**
 * Verifica e decodifica um access token
 */
export const verifyAccessToken = (token: string): { userId: string } => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded !== "object" || decoded === null || !("userId" in decoded) || typeof decoded.userId !== "string") {
    throw new Error("Token payload inválido");
  }
  return { userId: decoded.userId };
};

