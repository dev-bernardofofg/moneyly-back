import { Router } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import swaggerUi from "swagger-ui-express";
import { logger } from "./lib/logger";
import { AuthRouters } from "./routes/auth.router";
import { BudgetRouter } from "./routes/budget.router";
import { CategoryRouter } from "./routes/category.router";
import savingsGoalRoutes from "./routes/goal.router";
import { OverviewRouter } from "./routes/overview.router";
import { RecurringTransactionRouter } from "./routes/recurring-transaction.router";
import transactionRoutes from "./routes/transaction.router";
import { UserRouters } from "./routes/user.router";

let openApiDocument: Record<string, unknown> = {};
try {
  const openApiPath = join(__dirname, "../openapi.json");
  const openApiContent = readFileSync(openApiPath, "utf-8");
  openApiDocument = JSON.parse(openApiContent) as Record<string, unknown>;
} catch (error) {
  logger.warn("openapi.json não encontrado. Swagger docs não estarão disponíveis.");
  openApiDocument = {};
}

const router: Router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

router.use("/api-docs", swaggerUi.serve);
router.get(
  "/api-docs",
  swaggerUi.setup(openApiDocument, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Moneyly API Documentation",
  })
);

router.get("/api-docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(openApiDocument);
});

router.use("/auth", AuthRouters);
router.use("/user", UserRouters);
router.use("/transactions", transactionRoutes);
router.use("/categories", CategoryRouter);
router.use("/budgets", BudgetRouter);
router.use("/goals", savingsGoalRoutes);
router.use("/overview", OverviewRouter);
router.use("/recurring-transactions", RecurringTransactionRouter);

export default router;
