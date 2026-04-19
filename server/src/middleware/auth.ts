import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        isAdmin: boolean;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isAdmin: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }

    req.user = {
      id: user.id,
      isAdmin: user.isAdmin,
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token无效或已过期' });
  }
}
