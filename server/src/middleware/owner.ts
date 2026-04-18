import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  ownerId?: string | null;
  user?: {
    id: string;
    isAdmin: boolean;
  };
}

export function ownerMiddleware(req: Request, res: Response, next: NextFunction) {
  const isAdmin = (req as any).user?.isAdmin;
  const ownerId = req.headers['x-owner-id'] as string | undefined;

  if (isAdmin) {
    if (ownerId) {
      req.query.ownerId = ownerId;
    }
    return next();
  }

  if (!ownerId) {
    (req as any).ownerAccessDenied = true;
    req.query.ownerId = undefined;
  } else {
    req.query.ownerId = ownerId;
  }
  next();
}
