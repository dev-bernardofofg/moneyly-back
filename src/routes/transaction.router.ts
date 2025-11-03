import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  getCurrentFinancialPeriodSummary,
  getMonthlySummary,
  getTransactions,
  getTransactionSummary,
  updateTransaction,
} from "../controllers/transaction.controller";
import { authenticateUser } from "../middlewares/auth";
import { ensurePeriodExists } from "../middlewares/auto-period-creation";
import { validate } from "../middlewares/validate";
import { idParamSchema } from "../schemas/auth.schema";
import { transactionListQuerySchema } from "../schemas/pagination.schema";
import {
  transactionSchema,
  transactionUpdateSchema,
} from "../schemas/transaction.schema";

const TransactionsRouter: Router = Router();

TransactionsRouter.use(authenticateUser);
TransactionsRouter.use(ensurePeriodExists);

TransactionsRouter.post(
  "/create",
  validate({ body: transactionSchema }),
  createTransaction
);

TransactionsRouter.get(
  "/",
  validate({ query: transactionListQuerySchema }),
  getTransactions
);

TransactionsRouter.put(
  "/:id",
  validate({ body: transactionUpdateSchema, params: idParamSchema }),
  updateTransaction
);

TransactionsRouter.delete(
  "/:id",
  validate({ params: idParamSchema }),
  deleteTransaction
);

TransactionsRouter.get("/summary", getTransactionSummary);

TransactionsRouter.get("/summary-by-month", getMonthlySummary);

TransactionsRouter.get(
  "/summary-current-period",
  getCurrentFinancialPeriodSummary
);

export default TransactionsRouter;
