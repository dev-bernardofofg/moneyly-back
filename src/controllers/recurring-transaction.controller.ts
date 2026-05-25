import { ResponseHandler } from '../helpers/response-handler';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import { BadRequestError, NotFoundError } from '../services/errors';
import {
  createRecurringTransactionService,
  deactivateRecurringTransactionService,
  deleteRecurringTransactionService,
  getRecurringTransactionHistoryService,
  getRecurringTransactionsService,
  reactivateRecurringTransactionService,
  updateRecurringTransactionService,
} from '../services/recurring-transaction.service';

export const createRecurringTransaction = asyncHandler<AuthRequest>(async (req, res) => {
  const {
    type,
    title,
    amount,
    categoryId,
    frequency,
    dayOfMonth,
    dayOfWeek,
    description,
    totalInstallments,
    startDate,
  } = req.body;
  const recurring = await createRecurringTransactionService(req.user.id, {
    type,
    title,
    amount: String(amount),
    categoryId,
    frequency,
    dayOfMonth,
    dayOfWeek,
    description,
    totalInstallments,
    startDate,
  });
  return ResponseHandler.created(res, recurring, 'Transação recorrente criada com sucesso');
});

export const getRecurringTransactions = asyncHandler<AuthRequest>(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const { page, limit } = req.query as { page?: number; limit?: number };
  const result = await getRecurringTransactionsService(
    req.user.id,
    { page, limit },
    includeInactive
  );
  return ResponseHandler.paginated(
    res,
    result.data,
    result.pagination,
    'Transações recorrentes recuperadas com sucesso'
  );
});

export const updateRecurringTransaction = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID não fornecido');

  const updated = await updateRecurringTransactionService(id, req.user.id, req.body);
  if (!updated) throw new NotFoundError('Transação recorrente não encontrada');
  return ResponseHandler.success(res, updated, 'Transação recorrente atualizada com sucesso');
});

export const reactivateRecurringTransaction = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID não fornecido');

  const updated = await reactivateRecurringTransactionService(id, req.user.id);
  if (!updated) throw new NotFoundError('Transação recorrente não encontrada');
  return ResponseHandler.success(res, updated, 'Transação recorrente reativada com sucesso');
});

export const deactivateRecurringTransaction = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID não fornecido');

  const success = await deactivateRecurringTransactionService(id, req.user.id);
  if (!success) throw new NotFoundError('Transação recorrente não encontrada');
  return ResponseHandler.success(res, null, 'Transação recorrente desativada com sucesso');
});

export const getRecurringTransactionHistory = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID não fornecido');

  const transactions = await getRecurringTransactionHistoryService(id, req.user.id);
  return ResponseHandler.success(
    res,
    transactions,
    'Histórico de transações recuperado com sucesso'
  );
});

export const deleteRecurringTransaction = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID não fornecido');

  const success = await deleteRecurringTransactionService(id, req.user.id);
  if (!success) throw new NotFoundError('Transação recorrente não encontrada');
  return ResponseHandler.success(res, null, 'Transação recorrente deletada com sucesso');
});
