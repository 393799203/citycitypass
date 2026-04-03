import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  ownerId?: string | null;
}

export function ownerMiddleware(req: Request, res: Response, next: NextFunction) {
  const ownerId = req.headers['x-owner-id'] as string | undefined;
  if (ownerId) {
    req.query.ownerId = ownerId;
  }
  next();
}
