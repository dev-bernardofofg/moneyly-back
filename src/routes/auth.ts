import { Router } from "express";
import {
  createSession,
  createUser,
  getMe,
  updateMonthlyIncome,
} from "../controllers/authController";
import { authenticateUser } from "../middlewares/auth";

const AuthRouters: Router = Router();

AuthRouters.post("/sign-up", createUser);
AuthRouters.post("/sign-in", createSession);
AuthRouters.get("/me", authenticateUser, getMe);
AuthRouters.put("/income", authenticateUser, updateMonthlyIncome);

export default AuthRouters;
