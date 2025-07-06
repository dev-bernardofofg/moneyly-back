import { Router } from "express";
import AuthRouters from "./routes/auth";
import CategoryRouter from "./routes/category";
import TransactionsRouters from "./routes/transaction";
import UserRouters from "./routes/user";

const router: Router = Router();

// Rotas de autenticação (registro e login)
router.use("/auth", AuthRouters);

// Rotas de manipulação de dados do usuário
router.use("/users", UserRouters);

// Rotas de transações
router.use("/transactions", TransactionsRouters);

// Rotas de categorias
router.use("/categories", CategoryRouter);

export default router;
