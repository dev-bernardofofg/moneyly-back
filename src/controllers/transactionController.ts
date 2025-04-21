import { Response } from 'express';
import { AuthenticatedRequest } from "../middlewares/auth";
import Transaction from "../models/transaction";
import { format } from 'date-fns';
import User from '../models/user';

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

    const totalExpense = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalIncome = transactions.filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const user = await User.findById(req.userId);
    const monthlyIncome = user?.monthlyIncome ?? 0;

    const percentUsed =
      monthlyIncome > 0
        ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
        : null;

    const alert =
      percentUsed !== null && percentUsed >= 80
        ? 'Você já usou mais de 80% do seu rendimento mensal neste filtro!'
        : null;

    return res.json({
      transactions,
      totalExpense,
      totalIncome,
      monthlyIncome,
      percentUsed,
      alert,
    });
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

    let realIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === 'income') realIncome += tx.amount;
      if (tx.type === 'expense') totalExpense += tx.amount;

      if (!byCategory[tx.category]) {
        byCategory[tx.category] = 0;
      }

      byCategory[tx.category] += tx.amount;
    });

    const user = await User.findById(req.userId);
    const monthlyIncome = user?.monthlyIncome ?? 0;

    const balance = monthlyIncome - totalExpense;

    const percentUsed =
      monthlyIncome > 0
        ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
        : null;

    const alert =
      percentUsed !== null && percentUsed >= 80
        ? 'Você já usou mais de 80% do seu rendimento mensal!'
        : null;

    return res.json({
      realIncome,     // 💰 soma das transações tipo income
      monthlyIncome,  // 💼 salário fixo do usuário
      totalExpense,   // 💸 soma das expenses
      balance,        // 💼 - 💸
      percentUsed,
      byCategory,
      alert,
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
    const user = await User.findById(req.userId);
    const monthlyIncome = user?.monthlyIncome ?? 0;

    const summary: Record<string, {
      income: number;
      expense: number;
      percentUsed: number | null;
      alert: string | null;
    }> = {};

    transactions.forEach((tx) => {
      const monthKey = format(new Date(tx.date), 'yyyy-MM');

      if (!summary[monthKey]) {
        summary[monthKey] = {
          income: 0,
          expense: 0,
          percentUsed: null,
          alert: null,
        };
      }

      if (tx.type === 'income') summary[monthKey].income += tx.amount;
      if (tx.type === 'expense') summary[monthKey].expense += tx.amount;
    });

    // Gerar os percentuais e alertas com base no rendimento
    Object.keys(summary).forEach((monthKey) => {
      const { expense } = summary[monthKey];

      if (monthlyIncome > 0) {
        const percent = Number(((expense / monthlyIncome) * 100).toFixed(2));
        summary[monthKey].percentUsed = percent;

        if (percent >= 80) {
          const [year, month] = monthKey.split('-');
          const alertMonth = format(new Date(Number(year), Number(month) - 1), 'MMMM', { locale: undefined });
          summary[monthKey].alert = `Você gastou mais de 80% do seu rendimento em ${alertMonth}!`;
        }
      }
    });

    return res.json(summary);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar resumo mensal' });
  }
};