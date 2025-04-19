import express from 'express';
import { CreateUser, CreateSession, GetMe } from '../controllers/authController';
import { authenticateUser } from '../middlewares/auth';

const AuthRouters = express();

AuthRouters.post('/sign-up', CreateUser);
AuthRouters.post('/sign-in', CreateSession);
AuthRouters.get('/me', authenticateUser, GetMe)

export default AuthRouters;