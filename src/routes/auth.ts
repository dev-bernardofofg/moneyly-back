import express from 'express';
import { CreateUser, CreateSession } from '../controllers/authController';

const AuthRouters = express();

AuthRouters.post('/sign-up', CreateUser);
AuthRouters.post('/sign-in', CreateSession);

export default AuthRouters;