import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  getCurrentFinancialPeriodSummary,
  getMonthlySummary,
  getTransactions,
  getTransactionSummary,
  updateTransaction,
} from "../controllers/transactionController";
import { authenticateUser } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParamSchema } from "../schemas/authSchema";
import { transactionBodySchema } from "../schemas/paginationSchema";
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

TransactionsRouter.post(
  "/",
  authenticateUser,
  validate({ body: transactionBodySchema }),
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

TransactionsRouter.get(
  "/summary-current-period",
  authenticateUser,
  getCurrentFinancialPeriodSummary
);

export default TransactionsRouter;
