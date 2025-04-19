import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export interface AuthenticatedRequest extends Request {
	userId?: string;
}

export const authenticateUser = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.split(' ')[1];
	if (!token) return res.status(401).json({ error: 'Token não fornecido' });

	try {
		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
		req.userId = decoded.userId;
		next();
	} catch (error: any) {
		console.error(error);
		return res.status(401).json({ error: 'Token inválido' });
	}
};