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
import { validateBody } from "../middlewares/validateBody";
import {
  transactionSchema,
  transactionUpdateSchema,
} from "../schemas/transactionSchema";

const TransactionsRouter: Router = Router();

TransactionsRouter.post(
  "/create",
  authenticateUser,
  validateBody(transactionSchema),
  createTransaction
);
TransactionsRouter.get("/", authenticateUser, getTransactions);
TransactionsRouter.put(
  "/:id",
  authenticateUser,
  validateBody(transactionUpdateSchema),
  updateTransaction
);
TransactionsRouter.delete("/:id", authenticateUser, deleteTransaction);

TransactionsRouter.get("/summary", authenticateUser, getTransactionSummary);
TransactionsRouter.get(
  "/summary-by-month",
  authenticateUser,
  getMonthlySummary
);

export default TransactionsRouter;
