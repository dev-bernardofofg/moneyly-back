import { Router } from "express";
import {
  createRecurringTransaction,
  deactivateRecurringTransaction,
  deleteRecurringTransaction,
  getRecurringTransactions,
  updateRecurringTransaction,
} from "../controllers/recurring-transaction.controller";
import { authenticateUser } from "../middlewares/auth";

const RecurringTransactionRouter: Router = Router();

RecurringTransactionRouter.use(authenticateUser);

RecurringTransactionRouter.post("/", createRecurringTransaction);
RecurringTransactionRouter.get("/", getRecurringTransactions);
RecurringTransactionRouter.put("/:id", updateRecurringTransaction);
RecurringTransactionRouter.patch("/:id/deactivate", deactivateRecurringTransaction);
RecurringTransactionRouter.delete("/:id", deleteRecurringTransaction);

export { RecurringTransactionRouter };
