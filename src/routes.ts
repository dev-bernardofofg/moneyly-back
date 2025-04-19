import { Router } from "express";
import AuthRouters from "./routes/auth";
import TransactionsRouters from "./routes/transaction";

const router = Router()

router.use('/users', AuthRouters);
router.use('/transactions', TransactionsRouters);

export default router;