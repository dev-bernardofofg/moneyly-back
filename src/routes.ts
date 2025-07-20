import { Router } from "express";
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/category";
import categoryBudgetRoutes from "./routes/categoryBudget";
import { OverviewRouter } from "./routes/overview";
import savingsGoalRoutes from "./routes/savingsGoal";
import transactionRoutes from "./routes/transaction";
import userRoutes from "./routes/user";

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
router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/transactions", transactionRoutes);
router.use("/categories", categoryRoutes);
router.use("/category-budgets", categoryBudgetRoutes);
router.use("/savings-goals", savingsGoalRoutes);
router.use("/overview", OverviewRouter);

export default router;
