import { Response } from 'express';
import { AuthenticatedRequest } from "../middlewares/auth";
import Transaction from "../models/transaction";
import { format } from 'date-fns';
import { transactionSchema, transactionUpdateSchema } from '../schemas/transactionSchema';

export const createTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, amount, category, description, date } = req.body;

    const newTransaction = await Transaction.create({
      userId: req.userId,
      type,
      amount,
      category,
      description,
      date: date ? new Date(date) : new Date(),
    });

    return res.status(201).json(newTransaction);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar transação' });
  }
};
export const getTransactions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, startDate, endDate } = req.query;

    const filter: any = { userId: req.userId };

    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    return res.json(transactions);
  } catch (error) {
    console.error(error);
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

    if (date) transaction.date = new Date(date);
    if (type) transaction.type = type;
    if (amount) transaction.amount = amount;
    if (category) transaction.category = category;
    if (description) transaction.description = description;

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

export const getTransactionSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId });

    let totalIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === 'income') totalIncome += tx.amount;
      if (tx.type === 'expense') totalExpense += tx.amount;

      if (!byCategory[tx.category]) {
        byCategory[tx.category] = 0;
      }
      byCategory[tx.category] += tx.amount;
    });

    return res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byCategory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
};

export const getMonthlySummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const filter: any = { userId: req.userId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    const transactions = await Transaction.find(filter);

    const summary: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((tx) => {
      const monthKey = format(new Date(tx.date), 'yyyy-MM');

      if (!summary[monthKey]) {
        summary[monthKey] = { income: 0, expense: 0 };
      }

      if (tx.type === 'income') summary[monthKey].income += tx.amount;
      else summary[monthKey].expense += tx.amount;
    });

    return res.json(summary);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar resumo mensal' });
  }
};