import express from 'express';
import { createUser, createSession, getMe } from '../controllers/authController';
import { authenticateUser } from '../middlewares/auth';

const AuthRouters = express();

AuthRouters.post('/sign-up', createUser);
AuthRouters.post('/sign-in', createSession);
AuthRouters.get('/me', authenticateUser, getMe)

export default AuthRouters;