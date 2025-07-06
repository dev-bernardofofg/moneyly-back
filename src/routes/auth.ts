import { Router } from "express";
import { createSession, createUser } from "../controllers/authController";
import { validateBody } from "../middlewares/validate";
import { createUserSchema, loginSchema } from "../schemas/authSchema";

const AuthRouters: Router = Router();

// Rotas de autenticação
AuthRouters.post("/sign-up", validateBody(createUserSchema), createUser);
AuthRouters.post("/sign-in", validateBody(loginSchema), createSession);

export default AuthRouters;
