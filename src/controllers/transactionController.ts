import { format } from "date-fns";
import { Response } from "express";
import { PaginationHelper } from "../lib/pagination";
import { AuthenticatedRequest } from "../middlewares/auth";
import { TransactionRepository } from "../repositories/transactionRepository";
import { UserRepository } from "../repositories/userRepository";

export const createTransaction = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { type, amount, category, description, date } = req.body;

    const newTransaction = await TransactionRepository.create({
      userId: req.userId,
      type,
      amount,
      categoryId: category,
      description,
      date: date ? new Date(date) : new Date(),
    });

    return res.status(201).json(newTransaction);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar transação" });
  }
};

export const getTransactions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { category, startDate, endDate, page, limit } = req.query;

    const filters: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (category) {
      filters.category = category as string;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    // Verificar se há parâmetros de paginação
    const hasPagination = page || limit;

    if (hasPagination) {
      // Usar versão paginada
      const paginationParams = {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      const pagination = PaginationHelper.validateAndParse(paginationParams);
      const result = await TransactionRepository.findByUserIdPaginated(
        req.userId,
        pagination,
        filters
      );

      // Calcular totais para as transações da página atual
      const totalExpense = result.data
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalIncome = result.data
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const user = await UserRepository.findById(req.userId);
      const monthlyIncome = user?.monthlyIncome ?? 0;

      const percentUsed =
        monthlyIncome > 0
          ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
          : null;

      const alert =
        percentUsed !== null && percentUsed >= 80
          ? "Você já usou mais de 80% do seu rendimento mensal nesta página!"
          : null;

      return res.json({
        ...result,
        summary: {
          totalExpense,
          totalIncome,
          monthlyIncome,
          percentUsed,
          alert,
        },
      });
    } else {
      // Usar versão original (sem paginação)
      const transactions = await TransactionRepository.findByUserId(
        req.userId,
        filters
      );

      const totalExpense = transactions
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalIncome = transactions
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const user = await UserRepository.findById(req.userId);
      const monthlyIncome = user?.monthlyIncome ?? 0;

      const percentUsed =
        monthlyIncome > 0
          ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
          : null;

      const alert =
        percentUsed !== null && percentUsed >= 80
          ? "Você já usou mais de 80% do seu rendimento mensal neste filtro!"
          : null;

      return res.json({
        transactions,
        totalExpense,
        totalIncome,
        monthlyIncome,
        percentUsed,
        alert,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar transações" });
  }
};

export const updateTransaction = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { id } = req.params;
    const { type, amount, category, description, date } = req.body;

    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (type) updateData.type = type;
    if (amount) updateData.amount = amount;
    if (category) updateData.category = category;
    if (description) updateData.description = description;

    const transaction = await TransactionRepository.update(
      id,
      req.userId,
      updateData
    );

    if (!transaction) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    return res.json(transaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar transação" });
  }
};

export const deleteTransaction = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { id } = req.params;

    const transaction = await TransactionRepository.delete(id, req.userId);

    if (!transaction) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    return res.json({ message: "Transação deletada com sucesso" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao deletar transação" });
  }
};

export const getTransactionSummary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const transactions = await TransactionRepository.findAllByUserId(
      req.userId
    );

    let realIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === "income") realIncome += tx.amount;
      if (tx.type === "expense") totalExpense += tx.amount;

      if (!byCategory[tx.categoryId]) {
        byCategory[tx.categoryId] = 0;
      }

      byCategory[tx.categoryId] += tx.amount;
    });

    const user = await UserRepository.findById(req.userId);
    const monthlyIncome = user?.monthlyIncome ?? 0;

    const balance = monthlyIncome - totalExpense;

    const percentUsed =
      monthlyIncome > 0
        ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
        : null;

    const alert =
      percentUsed !== null && percentUsed >= 80
        ? "Você já usou mais de 80% do seu rendimento mensal!"
        : null;

    return res.json({
      realIncome, // 💰 soma das transações tipo income
      monthlyIncome, // 💼 salário fixo do usuário
      totalExpense, // 💸 soma das expenses
      balance, // 💼 - 💸
      percentUsed,
      byCategory,
      alert,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar resumo" });
  }
};

export const getMonthlySummary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { startDate, endDate } = req.query;

    const filters: {
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    const transactions = await TransactionRepository.findByUserId(
      req.userId,
      filters
    );
    const user = await UserRepository.findById(req.userId);
    const monthlyIncome = user?.monthlyIncome ?? 0;

    const summary: Record<
      string,
      {
        income: number;
        expense: number;
        percentUsed: number | null;
        alert: string | null;
      }
    > = {};

    transactions.forEach((tx) => {
      const monthKey = format(new Date(tx.date), "yyyy-MM");

      if (!summary[monthKey]) {
        summary[monthKey] = {
          income: 0,
          expense: 0,
          percentUsed: null,
          alert: null,
        };
      }

      if (tx.type === "income") {
        summary[monthKey].income += tx.amount;
      } else {
        summary[monthKey].expense += tx.amount;
      }
    });

    // Calcular percentual usado para cada mês
    Object.keys(summary).forEach((monthKey) => {
      const monthData = summary[monthKey];
      const totalExpense = monthData.expense;

      monthData.percentUsed =
        monthlyIncome > 0
          ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
          : null;

      monthData.alert =
        monthData.percentUsed !== null && monthData.percentUsed >= 80
          ? "Você já usou mais de 80% do seu rendimento mensal!"
          : null;
    });

    return res.json({
      summary,
      monthlyIncome,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar resumo mensal" });
  }
};
