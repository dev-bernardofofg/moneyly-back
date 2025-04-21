import express from 'express';
import { authenticateUser } from '../middlewares/auth';
import { createTransaction, deleteTransaction, getMonthlySummary, getTransactions, getTransactionSummary, updateTransaction } from '../controllers/transactionController';
import { validateBody } from '../middlewares/validateBody';
import { transactionSchema, transactionUpdateSchema } from '../schemas/transactionSchema';


const TransactionsRouters = express();

TransactionsRouters.post('/create', authenticateUser, validateBody(transactionSchema), createTransaction)
TransactionsRouters.get('/', authenticateUser, getTransactions)
TransactionsRouters.put('/:id', authenticateUser, validateBody(transactionUpdateSchema), updateTransaction)
TransactionsRouters.delete('/:id', authenticateUser, deleteTransaction)

TransactionsRouters.get('/summary', authenticateUser, getTransactionSummary)
TransactionsRouters.get('/summary-by-month', authenticateUser, getMonthlySummary)

export default TransactionsRouters