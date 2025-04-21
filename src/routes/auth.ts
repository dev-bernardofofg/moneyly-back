import express from 'express';
import { createUser, createSession, getMe, updateMonthlyIncome } from '../controllers/authController';
import { authenticateUser } from '../middlewares/auth';

const AuthRouters = express();

AuthRouters.post('/sign-up', createUser);
AuthRouters.post('/sign-in', createSession);
AuthRouters.get('/me', authenticateUser, getMe)
AuthRouters.put('/income', authenticateUser, updateMonthlyIncome)

export default AuthRouters;