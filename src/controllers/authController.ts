import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import { AuthenticatedRequest } from '../middlewares/auth';


const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

// Função para gerar JWT
const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Verificar se todos os campos foram preenchidos
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // Verificar se o usuário já existe
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ error: 'Email já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    // Criar o novo usuário
    const newUser = await User.create({ name, email, password: hashedPassword });

    // Retornar o token JWT
    const token = generateToken(String(newUser._id));

    return res.status(201).json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
      token,
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Verificar se os campos foram preenchidos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    // Verificar se o usuário existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Usuário não encontrado.' });
    }

    // Verificar a senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha inválida.' });
    }

    // Gerar token
    const token = generateToken(String(user._id));

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao buscar usuário' });
  }
};