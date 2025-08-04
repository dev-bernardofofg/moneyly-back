import { format } from "date-fns";
import { Response } from "express";
import { getCurrentFinancialPeriod } from "../helpers/financial-period";
import { ResponseHandler } from "../helpers/response-handler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { TransactionRepository } from "../repositories/transaction.repository";
import { UserRepository } from "../repositories/user.repository";
import {
  createTransactionService,
  updateTransactionService,
} from "../services/transaction.service";
import { validatePagination } from "../validations/pagination.validation";

export const createTransaction = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { type, title, amount, category, description, date } = req.body;
  const { id: userId } = req.user;

  try {
    const newTransaction = await createTransactionService(userId, {
      type,
      title,
      amount,
      category,
      description,
      date,
    });

    return ResponseHandler.created(
      res,
      newTransaction,
      "Transação criada com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao criar transação", error);
  }
};

export const getTransactions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId } = req.user;
  const { category, startDate, endDate, page, limit } = req.body;
  try {
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

    const paginationExists = await validatePagination(page, limit);

    if (paginationExists) {
      // Usar versão paginada
      const result = await TransactionRepository.findByUserIdPaginated(
        userId,
        paginationExists,
        filters
      );

      // Calcular totais para as transações da página atual
      const totalExpense = result.data
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const totalIncome = result.data
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const user = await UserRepository.findById(userId);
      const monthlyIncome = Number(user?.monthlyIncome) ?? 0;

      const percentUsed =
        monthlyIncome > 0
          ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
          : null;

      const alert =
        percentUsed !== null && percentUsed >= 80
          ? "Você já usou mais de 80% do seu rendimento mensal nesta página!"
          : null;

      return ResponseHandler.success(
        res,
        {
          transactions: result.data,
          pagination: result.pagination,
          totalExpense,
          totalIncome,
          monthlyIncome,
          percentUsed,
          alert,
        },
        "Transações recuperadas com sucesso"
      );
    } else {
      // Usar versão original (sem paginação)
      const transactions = await TransactionRepository.findByUserId(
        userId,
        filters
      );

      const totalExpense = transactions
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const totalIncome = transactions
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const user = await UserRepository.findById(userId);
      const monthlyIncome = Number(user?.monthlyIncome) ?? 0;

      const percentUsed =
        monthlyIncome > 0
          ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
          : null;

      const alert =
        percentUsed !== null && percentUsed >= 80
          ? "Você já usou mais de 80% do seu rendimento mensal neste filtro!"
          : null;

      return ResponseHandler.success(
        res,
        {
          transactions,
          pagination: {
            page: 1,
            limit: transactions.length,
            total: transactions.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
          totalExpense,
          totalIncome,
          monthlyIncome,
          percentUsed,
          alert,
        },
        "Transações recuperadas com sucesso"
      );
    }
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao buscar transações", error);
  }
};

export const updateTransaction = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId } = req.user;
  try {
    const { id } = req.params;
    const { type, title, amount, category, description, date } = req.body;

    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (type) updateData.type = type;
    if (title) updateData.title = title;
    if (amount) updateData.amount = amount;
    if (category) updateData.categoryId = category;
    if (description) updateData.description = description;

    const transaction = await updateTransactionService(id, userId, updateData);

    return ResponseHandler.success(
      res,
      transaction,
      "Transação atualizada com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao atualizar transação", error);
  }
};

export const deleteTransaction = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId } = req.user;
  try {
    const { id } = req.params;

    const deleted = await TransactionRepository.delete(id, userId);

    if (!deleted) {
      return ResponseHandler.notFound(res, "Transação não encontrada");
    }

    return ResponseHandler.success(res, null, "Transação deletada com sucesso");
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao deletar transação", error);
  }
};

export const getTransactionSummary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id: userId } = req.user;
  try {
    const transactions = await TransactionRepository.findAllByUserId(userId);

    let realIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === "income") realIncome += Number(tx.amount);
      if (tx.type === "expense") totalExpense += Number(tx.amount);

      if (!byCategory[tx.category.id]) {
        byCategory[tx.category.id] = 0;
      }

      byCategory[tx.category.id] += Number(tx.amount);
    });

    const user = await UserRepository.findById(userId);
    const monthlyIncome = Number(user?.monthlyIncome) ?? 0;

    const balance = monthlyIncome - totalExpense;

    const percentUsed =
      monthlyIncome > 0
        ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
        : null;

    const alert =
      percentUsed !== null && percentUsed >= 80
        ? "Você já usou mais de 80% do seu rendimento mensal!"
        : null;

    return ResponseHandler.success(
      res,
      {
        realIncome, // 💰 soma das transações tipo income
        monthlyIncome, // 💼 salário fixo do usuário
        totalExpense, // 💸 soma das expenses
        balance, // 💼 - 💸
        percentUsed,
        byCategory,
        alert,
      },
      "Resumo das transações gerado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao gerar resumo", error);
  }
};

export const getMonthlySummary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id: userId } = req.user;
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
      userId,
      filters
    );
    const user = await UserRepository.findById(userId);
    const monthlyIncome = Number(user?.monthlyIncome) ?? 0;

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
        summary[monthKey].income += Number(tx.amount);
      } else {
        summary[monthKey].expense += Number(tx.amount);
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

    return ResponseHandler.success(
      res,
      {
        summary,
        monthlyIncome,
      },
      "Resumo mensal gerado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao gerar resumo mensal", error);
  }
};

export const getCurrentFinancialPeriodSummary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id: userId } = req.user;
    const user = await UserRepository.findById(userId);
    if (!user) {
      return ResponseHandler.notFound(res, "Usuário não encontrado");
    }

    const financialDayStart = user.financialDayStart ?? 1;
    const financialDayEnd = user.financialDayEnd ?? 31;
    const monthlyIncome = Number(user.monthlyIncome) ?? 0;

    // Calcular o período financeiro atual
    const currentPeriod = getCurrentFinancialPeriod(
      financialDayStart,
      financialDayEnd
    );

    // Buscar transações do período financeiro atual
    const transactions = await TransactionRepository.findByUserId(userId, {
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
    });

    let realIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === "income") realIncome += Number(tx.amount);
      if (tx.type === "expense") totalExpense += Number(tx.amount);

      if (!byCategory[tx.category.id]) {
        byCategory[tx.category.id] = 0;
      }

      byCategory[tx.category.id] += Number(tx.amount) ?? 0;
    });

    const balance = monthlyIncome - totalExpense;

    const percentUsed =
      monthlyIncome > 0
        ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2))
        : null;

    const alert =
      percentUsed !== null && percentUsed >= 80
        ? "Você já usou mais de 80% do seu rendimento mensal no período atual!"
        : null;

    return ResponseHandler.success(
      res,
      {
        currentPeriod: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          description: `Período financeiro: ${format(
            currentPeriod.startDate,
            "dd/MM/yyyy"
          )} a ${format(currentPeriod.endDate, "dd/MM/yyyy")}`,
        },
        realIncome, // 💰 soma das transações tipo income no período
        monthlyIncome, // 💼 salário fixo do usuário
        totalExpense, // 💸 soma das expenses no período
        balance, // 💼 - 💸
        percentUsed,
        byCategory,
        alert,
        transactionsCount: transactions.length,
      },
      "Resumo do período financeiro atual gerado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao gerar resumo do período financeiro",
      error
    );
  }
};
