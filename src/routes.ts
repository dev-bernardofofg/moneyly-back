import { Router } from "express";
import AuthRouters from "./routes/auth";

const router = Router()

router.use('/users', AuthRouters);

export default router;