import express from 'express';
import { authenticateUser } from '../middlewares/auth';
import { createTransaction, deleteTransaction, getTransactions, updateTransaction } from '../controllers/transactionController';


const TransactionsRouters = express();

TransactionsRouters.post('/create', authenticateUser, createTransaction)
TransactionsRouters.get('/', authenticateUser, getTransactions)
TransactionsRouters.put('/:id', authenticateUser, updateTransaction)
TransactionsRouters.delete('/:id', authenticateUser, deleteTransaction)

export default TransactionsRouters