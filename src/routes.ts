import { Router } from "express";
import AuthRouters from "./routes/auth";
import CategoryRouter from "./routes/category";
import TransactionsRouters from "./routes/transaction";

const router: Router = Router();

router.use("/users", AuthRouters);
router.use("/transactions", TransactionsRouters);
router.use("/categories", CategoryRouter);

export default router;
