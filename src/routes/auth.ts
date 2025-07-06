import { Router } from "express";
import { createSession, createUser } from "../controllers/authController";
import { authRateLimit } from "../middlewares/security";
import { validateBody } from "../middlewares/validate";
import { createUserSchema, loginSchema } from "../schemas/authSchema";

const AuthRouters: Router = Router();

// Rotas de autenticação com rate limiting
AuthRouters.post(
  "/sign-up",
  authRateLimit,
  validateBody(createUserSchema),
  createUser
);
AuthRouters.post(
  "/sign-in",
  authRateLimit,
  validateBody(loginSchema),
  createSession
);

export default AuthRouters;
