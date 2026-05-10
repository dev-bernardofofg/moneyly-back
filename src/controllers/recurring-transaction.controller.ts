import type { NextFunction, Response } from "express";
import { isHttpError } from "../helpers/errors";
import { ResponseHandler } from "../helpers/response-handler";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  createRecurringTransactionService,
  deactivateRecurringTransactionService,
  deleteRecurringTransactionService,
  getRecurringTransactionsService,
  updateRecurringTransactionService,
} from "../services/recurring-transaction.service";

export const createRecurringTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const { type, title, amount, categoryId, frequency, dayOfMonth, dayOfWeek, description } =
      req.body;
    const recurring = await createRecurringTransactionService(req.user.id, {
      type,
      title,
      amount: String(amount),
      categoryId,
      frequency,
      dayOfMonth,
      dayOfWeek,
      description,
    });
    return ResponseHandler.created(res, recurring, "Transação recorrente criada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao criar transação recorrente", error);
  }
};

export const getRecurringTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  try {
    const includeInactive = req.query.includeInactive === "true";
    const recurring = await getRecurringTransactionsService(req.user.id, includeInactive);
    return ResponseHandler.success(
      res,
      recurring,
      "Transações recorrentes recuperadas com sucesso"
    );
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao buscar transações recorrentes", error);
  }
};

export const updateRecurringTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, "ID não fornecido");

  try {
    const updated = await updateRecurringTransactionService(id, req.user.id, req.body);
    if (!updated) return ResponseHandler.notFound(res, "Transação recorrente não encontrada");
    return ResponseHandler.success(res, updated, "Transação recorrente atualizada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao atualizar transação recorrente", error);
  }
};

export const deactivateRecurringTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, "ID não fornecido");

  try {
    const success = await deactivateRecurringTransactionService(id, req.user.id);
    if (!success) return ResponseHandler.notFound(res, "Transação recorrente não encontrada");
    return ResponseHandler.success(res, null, "Transação recorrente desativada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao desativar transação recorrente", error);
  }
};

export const deleteRecurringTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return ResponseHandler.unauthorized(res, "Usuário não autenticado");

  const { id } = req.params;
  if (!id) return ResponseHandler.badRequest(res, "ID não fornecido");

  try {
    const success = await deleteRecurringTransactionService(id, req.user.id);
    if (!success) return ResponseHandler.notFound(res, "Transação recorrente não encontrada");
    return ResponseHandler.success(res, null, "Transação recorrente deletada com sucesso");
  } catch (error) {
    if (isHttpError(error)) return next(error);
    return ResponseHandler.error(res, "Erro ao deletar transação recorrente", error);
  }
};
