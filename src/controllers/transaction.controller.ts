import { format } from "date-fns";
import type { NextFunction, Response } from "express";
import { isHttpError } from "../helpers/errors";
import { ResponseHandler } from "../helpers/response-handler";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  createTransactionService,
  deleteTransactionService,
  getCurrentPeriodSummaryService,
  getMonthlySummaryService,
  getTransactionListService,
  getTransactionsPaginatedService,
  getTransactionSummaryService,
  updateTransactionService,
} from "../services/transaction.service";
import { validatePagination } from "../validations/pagination.validation";

export const createTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { type, title, amount, category, description, date } = req.body;

  try {
    const newTransaction = await createTransactionService(req.user.id, {
      type,
      title,
      amount,
      category,
      description,
      date,
    });
    return ResponseHandler.created(res, newTransaction, "Transação criada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível criar a transação. Por favor, verifique os dados e tente novamente.",
      error
    );
  }
};

export const getTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { category, startDate, endDate, page, limit } = req.query as {
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  };

  try {
    const filters: { category?: string; startDate?: Date; endDate?: Date } = {};
    if (category) filters.category = category;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const pagination = await validatePagination(page, limit);

    if (pagination) {
      const result = await getTransactionsPaginatedService(req.user.id, pagination, filters);
      return ResponseHandler.paginated(
        res,
        result.data,
        result.pagination,
        "Transações recuperadas com sucesso"
      );
    }

    const { transactions, totalExpense, totalIncome, monthlyIncome, percentUsed, alert } =
      await getTransactionListService(req.user.id, filters);

    return ResponseHandler.success(
      res,
      {
        data: transactions,
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
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível buscar as transações. Por favor, tente novamente.",
      error
    );
  }
};

export const updateTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, "ID da transação não fornecido");

  try {
    const { type, title, amount, category, description, date } = req.body;

    const updateData: Partial<{
      type: "income" | "expense";
      title: string;
      amount: string;
      categoryId: string;
      description: string;
      date: Date;
    }> = {};
    if (date) updateData.date = new Date(date);
    if (type) updateData.type = type;
    if (title) updateData.title = title;
    if (amount) updateData.amount = amount;
    if (category) updateData.categoryId = category;
    if (description) updateData.description = description;

    const transaction = await updateTransactionService(id, req.user.id, updateData);
    return ResponseHandler.success(res, transaction, "Transação atualizada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível atualizar a transação. Verifique se os dados estão corretos e tente novamente.",
      error
    );
  }
};

export const deleteTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, "ID da transação não fornecido");

  try {
    await deleteTransactionService(id, req.user.id);
    return ResponseHandler.success(res, null, "Transação deletada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível deletar a transação. Por favor, tente novamente.",
      error
    );
  }
};

export const getTransactionSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const summary = await getTransactionSummaryService(req.user.id);
    return ResponseHandler.success(res, summary, "Resumo das transações gerado com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível gerar o resumo das transações. Por favor, tente novamente.",
      error
    );
  }
};

export const getMonthlySummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { startDate, endDate } = req.query;

  try {
    const filters: { startDate?: Date; endDate?: Date } = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const summaryArray = await getMonthlySummaryService(req.user.id, filters);
    return ResponseHandler.success(res, summaryArray, "Resumo mensal gerado com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(
      res,
      "Não foi possível gerar o resumo mensal. Por favor, tente novamente.",
      error
    );
  }
};

export const exportTransactionsCsv = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    ResponseHandler.unauthorized(res, "Usuário não autenticado");
    return;
  }

  try {
    const { startDate, endDate } = req.query;
    const filters: { startDate?: Date; endDate?: Date } = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const { transactions } = await getTransactionListService(req.user.id, filters);

    const headers = ["ID", "Tipo", "Título", "Valor", "Categoria", "Descrição", "Data"];
    const rows = transactions.map((tx) => [
      tx.id,
      tx.type === "income" ? "Receita" : "Despesa",
      tx.title,
      Number(tx.amount).toFixed(2).replace(".", ","),
      tx.category.name,
      tx.description ?? "",
      format(new Date(tx.date), "dd/MM/yyyy"),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");

    const filename = `transacoes-${format(new Date(), "yyyy-MM-dd")}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("﻿" + csv);
  } catch (error) {
    if (isHttpError(error)) {
      next(error);
      return;
    }
    ResponseHandler.error(res, "Erro ao exportar transações", error);
  }
};

export const getCurrentFinancialPeriodSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const summary = await getCurrentPeriodSummaryService(req.user.id);
    return ResponseHandler.success(
      res,
      summary,
      "Resumo do período financeiro atual gerado com sucesso"
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao gerar resumo do período financeiro", error);
  }
};
