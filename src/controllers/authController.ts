import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
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

    // Verificar se todos os campos foram preenchidos
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios." });
    }

    // Verificar se o usuário já existe
    const userExists = await UserRepository.findByEmail(email);

    if (userExists) {
      return res.status(400).json({ error: "Email já cadastrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar o novo usuário
    const newUser = await UserRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    // Retornar o token JWT
    const token = generateToken(newUser.id);

    return res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
      token,
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Verificar se os campos foram preenchidos
    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    // Verificar se o usuário existe
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    // Verificar a senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Senha inválida." });
    }

    // Gerar token
    const token = generateToken(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const user = await UserRepository.findByIdWithoutPassword(req.userId);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    let updatedToken: string | undefined;

    if (user.firstAccess) {
      await UserRepository.updateFirstAccess(user.id, false);
      updatedToken = generateToken(user.id);
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        monthlyIncome: user.monthlyIncome ?? 0,
        createdAt: user.createdAt,
      },
      ...(updatedToken && { token: updatedToken }),
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao buscar usuário" });
  }
};

export const updateMonthlyIncome = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { monthlyIncome } = req.body;

    if (!monthlyIncome || isNaN(monthlyIncome) || monthlyIncome < 0) {
      return res.status(400).json({ error: "Informe um rendimento válido." });
    }

    const user = await UserRepository.updateMonthlyIncome(
      req.userId,
      monthlyIncome
    );

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    return res.json({
      message: "Rendimento atualizado com sucesso.",
      monthlyIncome,
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar rendimento." });
  }
};
