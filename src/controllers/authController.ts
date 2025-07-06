import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { createDefaultCategoriesForUser } from "../db/seed";
import { ResponseHandler } from "../lib/ResponseHandler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { UserRepository } from "../repositories/userRepository";

const JWT_SECRET = process.env.JWT_SECRET || "segredo_super_secreto";

// Função para gerar JWT
const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Verificar se o usuário já existe
    const userExists = await UserRepository.findByEmail(email);

    if (userExists) {
      return ResponseHandler.error(res, "Email já cadastrado", undefined, 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar o novo usuário
    const newUser = await UserRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    // Criar categorias padrão para o novo usuário
    try {
      await createDefaultCategoriesForUser(newUser.id);
    } catch (categoryError) {
      console.error("Erro ao criar categorias padrão:", categoryError);
      // Não falhar o registro se as categorias não puderem ser criadas
    }

    // Retornar o token JWT
    const token = generateToken(newUser.id);

    return ResponseHandler.created(
      res,
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
        token,
      },
      "Usuário criado com sucesso"
    );
  } catch (error) {
    console.error("Erro no registro:", error);
    return ResponseHandler.serverError(res);
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Verificar se o usuário existe
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return ResponseHandler.error(
        res,
        "Usuário não encontrado",
        undefined,
        404
      );
    }

    // Verificar a senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return ResponseHandler.unauthorized(res, "Senha inválida");
    }

    // Gerar token
    const token = generateToken(user.id);

    return ResponseHandler.success(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      },
      "Login realizado com sucesso"
    );
  } catch (error) {
    console.error("Erro no login:", error);
    return ResponseHandler.serverError(res);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const user = await UserRepository.findByIdWithoutPassword(req.userId);

    if (!user) {
      return ResponseHandler.notFound(res, "Usuário não encontrado");
    }

    let updatedToken: string | undefined;

    if (user.firstAccess) {
      await UserRepository.updateFirstAccess(user.id, false);
      updatedToken = generateToken(user.id);
    }

    return ResponseHandler.success(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          monthlyIncome: user.monthlyIncome ?? 0,
          createdAt: user.createdAt,
        },
        ...(updatedToken && { token: updatedToken }),
      },
      "Dados do usuário recuperados com sucesso"
    );
  } catch (error) {
    return ResponseHandler.serverError(res);
  }
};

export const updateMonthlyIncome = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { monthlyIncome } = req.body;

    const user = await UserRepository.updateMonthlyIncome(
      req.userId,
      monthlyIncome
    );

    if (!user) {
      return ResponseHandler.notFound(res, "Usuário não encontrado");
    }

    return ResponseHandler.success(
      res,
      { monthlyIncome },
      "Rendimento atualizado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.serverError(res);
  }
};
