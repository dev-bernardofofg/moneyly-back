import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const asyncHandler =
  <Req extends Request = Request>(handler: AsyncHandler<Req>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req as Req, res, next)).catch(next);
  };
