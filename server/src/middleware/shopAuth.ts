import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const shopAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('[ShopAuth] Headers:', req.headers);
    console.log('[ShopAuth] AuthHeader:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[ShopAuth] No Bearer token');
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    const token = authHeader.substring(7);
    console.log('[ShopAuth] Token:', token);
    console.log('[ShopAuth] JWT_SECRET:', JWT_SECRET);
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
    console.log('[ShopAuth] Decoded:', decoded);
    
    if (decoded.type !== 'shop') {
      console.log('[ShopAuth] Invalid token type:', decoded.type);
      return res.status(401).json({ success: false, message: '无效的令牌类型' });
    }

    (req as any).shopUser = decoded;
    next();
  } catch (error) {
    console.error('[ShopAuth] Auth failed error:', error);
    if (error instanceof jwt.TokenExpiredError) {
      console.error('[ShopAuth] Token expired');
      return res.status(401).json({ success: false, message: '令牌已过期' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('[ShopAuth] Invalid token');
      return res.status(401).json({ success: false, message: '无效的令牌' });
    }
    return res.status(401).json({ success: false, message: '认证失败' });
  }
};
