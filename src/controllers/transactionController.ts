import { Response } from 'express';
import { AuthenticatedRequest } from "../middlewares/auth";
import Transaction from "../models/transaction";

export const createTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, amount, category, description, date } = req.body;

    if (!type || !amount || !category) {
      return res.status(400).json({
        error: 'Campos obrigatórios: type, amount e category.',
      });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido. Use "income" ou "expense".' });
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'O campo amount deve ser um número positivo.' });
    }

    const newTransaction = await Transaction.create({
      userId: req.userId,
      type,
      amount,
      category,
      description,
      date: date || new Date(),
    });

    return res.status(201).json(newTransaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar transação' });
  }
};

export const getTransactions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId }).sort({ date: -1 });
    return res.json(transactions);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar transações' });
  }
};

export const updateTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, amount, category, description, date } = req.body;

    const transaction = await Transaction.findOne({ _id: id, userId: req.userId });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    transaction.type = type ?? transaction.type;
    transaction.amount = amount ?? transaction.amount;
    transaction.category = category ?? transaction.category;
    transaction.description = description ?? transaction.description;
    transaction.date = date ?? transaction.date;

    await transaction.save();

    return res.json(transaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
};

export const deleteTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    return res.json({ message: 'Transação deletada com sucesso' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao deletar transação' });
  }
};
