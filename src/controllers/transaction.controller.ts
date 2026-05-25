import { format } from 'date-fns';
import { ResponseHandler } from '../helpers/response-handler';
import { buildTransactionFilters } from '../helpers/transaction-filters';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import { BadRequestError } from '../services/errors';
import {
  createTransactionService,
  deleteTransactionService,
  getCurrentPeriodSummaryService,
  getMonthlySummaryService,
  getTransactionListService,
  getTransactionsPaginatedService,
  getTransactionSummaryService,
  updateTransactionService,
} from '../services/transaction.service';
import { validatePagination } from '../validations/pagination.validation';
import { detectSubscriptionsService } from '../services/subscription.service';

export const createTransaction = asyncHandler<AuthRequest>(async (req, res) => {
  const { type, title, amount, category, description, date } = req.body;

  const newTransaction = await createTransactionService(req.user.id, {
    type,
    title,
    amount,
    category,
    description,
    date,
  });
  return ResponseHandler.created(res, newTransaction, 'Transação criada com sucesso');
});

export const getTransactions = asyncHandler<AuthRequest>(async (req, res) => {
  const { page, limit } = req.query as { page?: number; limit?: number };
  const filters = buildTransactionFilters(req.query);

  const pagination = await validatePagination(page, limit);

  const [paginatedResult, summary] = await Promise.all([
    pagination ? getTransactionsPaginatedService(req.user.id, pagination, filters) : null,
    getTransactionListService(req.user.id, filters),
  ]);

  const transactionSummary = {
    totalExpense: summary.totalExpense,
    totalIncome: summary.totalIncome,
    monthlyIncome: summary.monthlyIncome,
    percentUsed: summary.percentUsed,
    alert: summary.alert,
  };

  if (pagination && paginatedResult) {
    return ResponseHandler.paginated(
      res,
      paginatedResult.data,
      paginatedResult.pagination,
      'Transações recuperadas com sucesso',
      { summary: transactionSummary }
    );
  }

  return ResponseHandler.success(
    res,
    {
      data: summary.transactions,
      pagination: {
        page: 1,
        limit: summary.transactions.length,
        total: summary.transactions.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      summary: transactionSummary,
    },
    'Transações recuperadas com sucesso'
  );
});

export const updateTransaction = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da transação não fornecido');

  const { type, title, amount, category, description, date } = req.body;

  const updateData: Partial<{
    type: 'income' | 'expense';
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
  return ResponseHandler.success(res, transaction, 'Transação atualizada com sucesso');
});

export const deleteTransaction = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID da transação não fornecido');

  await deleteTransactionService(id, req.user.id);
  return ResponseHandler.success(res, null, 'Transação deletada com sucesso');
});

export const getTransactionSummary = asyncHandler<AuthRequest>(async (req, res) => {
  const summary = await getTransactionSummaryService(req.user.id);
  return ResponseHandler.success(res, summary, 'Resumo das transações gerado com sucesso');
});

export const getMonthlySummary = asyncHandler<AuthRequest>(async (req, res) => {
  const { startDate, endDate } = req.query;

  const filters: { startDate?: Date; endDate?: Date } = {};
  if (startDate) filters.startDate = new Date(startDate as string);
  if (endDate) filters.endDate = new Date(endDate as string);

  const summaryArray = await getMonthlySummaryService(req.user.id, filters);
  return ResponseHandler.success(res, summaryArray, 'Resumo mensal gerado com sucesso');
});

export const exportTransactionsCsv = asyncHandler<AuthRequest>(async (req, res) => {
  const filters = buildTransactionFilters(req.query);

  const { transactions } = await getTransactionListService(req.user.id, filters);

  const headers = ['ID', 'Tipo', 'Título', 'Valor', 'Categoria', 'Descrição', 'Data'];
  const rows = transactions.map((tx) => [
    tx.id,
    tx.type === 'income' ? 'Receita' : 'Despesa',
    tx.title,
    Number(tx.amount).toFixed(2).replace('.', ','),
    tx.category.name,
    tx.description ?? '',
    format(new Date(tx.date), 'dd/MM/yyyy'),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const filename = `transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv);
});

export const getSubscriptions = asyncHandler<AuthRequest>(async (req, res) => {
  const candidates = await detectSubscriptionsService(req.user.id);
  return ResponseHandler.success(res, candidates, 'Possíveis assinaturas detectadas');
});

export const getCurrentFinancialPeriodSummary = asyncHandler<AuthRequest>(async (req, res) => {
  const summary = await getCurrentPeriodSummaryService(req.user.id);
  return ResponseHandler.success(
    res,
    summary,
    'Resumo do período financeiro atual gerado com sucesso'
  );
});
