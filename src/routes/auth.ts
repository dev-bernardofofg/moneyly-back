import { Router } from "express";
import {
  createGoogleSession,
  createSession,
  createUser,
} from "../controllers/authController";
import { authRateLimit } from "../middlewares/security";
import { validateBody } from "../middlewares/validate";
import {
  createUserSchema,
  googleAuthSchema,
  loginSchema,
} from "../schemas/authSchema";

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
AuthRouters.post(
  "/google",
  authRateLimit,
  validateBody(googleAuthSchema),
  createGoogleSession
);

export default AuthRouters;
