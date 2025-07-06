import { Router } from "express";
import {
  createSession,
  createUser,
  getMe,
  updateMonthlyIncome,
} from "../controllers/authController";
import { authenticateUser } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import {
  createUserSchema,
  loginSchema,
  updateMonthlyIncomeSchema,
} from "../schemas/authSchema";

const AuthRouters: Router = Router();

AuthRouters.post("/sign-up", validateBody(createUserSchema), createUser);
AuthRouters.post("/sign-in", validateBody(loginSchema), createSession);
AuthRouters.get("/me", authenticateUser, getMe);
AuthRouters.put(
  "/income",
  authenticateUser,
  validateBody(updateMonthlyIncomeSchema),
  updateMonthlyIncome
);

export default AuthRouters;
