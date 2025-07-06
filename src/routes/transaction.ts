import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
  getTransactions,
  getTransactionSummary,
  updateTransaction,
} from "../controllers/transactionController";
import { authenticateUser } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParamSchema, transactionQuerySchema } from "../schemas/authSchema";
import {
  transactionSchema,
  transactionUpdateSchema,
} from "../schemas/transactionSchema";

const TransactionsRouter: Router = Router();

TransactionsRouter.post(
  "/create",
  authenticateUser,
  validate({ body: transactionSchema }),
  createTransaction
);

TransactionsRouter.get(
  "/",
  authenticateUser,
  validate({ query: transactionQuerySchema }),
  getTransactions
);

TransactionsRouter.put(
  "/:id",
  authenticateUser,
  validate({ body: transactionUpdateSchema, params: idParamSchema }),
  updateTransaction
);

TransactionsRouter.delete(
  "/:id",
  authenticateUser,
  validate({ params: idParamSchema }),
  deleteTransaction
);

TransactionsRouter.get("/summary", authenticateUser, getTransactionSummary);

TransactionsRouter.get(
  "/summary-by-month",
  authenticateUser,
  getMonthlySummary
);

export default TransactionsRouter;
