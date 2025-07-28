import { Router } from "express";
import { AuthRouters } from "./routes/auth.router";
import { BudgetRouter } from "./routes/budget.router";
import { CategoryRouter } from "./routes/category.router";
import savingsGoalRoutes from "./routes/goal.router";
import { OverviewRouter } from "./routes/overview.router";
import transactionRoutes from "./routes/transaction.router";
import { UserRouters } from "./routes/user.router";

const router: Router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Rotas da aplicação
router.use("/auth", AuthRouters);
router.use("/user", UserRouters);
router.use("/transactions", transactionRoutes);
router.use("/categories", CategoryRouter);
router.use("/budgets", BudgetRouter);
router.use("/goals", savingsGoalRoutes);
router.use("/overview", OverviewRouter);

export default router;
