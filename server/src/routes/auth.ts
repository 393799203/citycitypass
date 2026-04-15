import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER', 'TRANSPORT_MANAGER', 'AFTER_SALES_MANAGER', 'GUEST']).optional().default('GUEST'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  ownerId: z.string().optional(),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const { username, password } = data;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          phone: user.phone,
          email: user.email,
          ownerId: user.ownerId,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        phone: data.phone,
        email: data.email,
      },
    });

    res.json({ success: true, data: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // 获取用户信息、权限和主体
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }

    // 获取用户所属的角色权限
    const role = await prisma.role.findUnique({
      where: { code: user.role },
    });

    // 获取用户所属的所有主体
    let owners = [];
    if (user.role === 'ADMIN') {
      // ADMIN可以看到所有主体
      owners = await prisma.owner.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    } else {
      // 其他用户只能看到自己所属的主体（通过UserOwner关联）
      const userOwners = await prisma.userOwner.findMany({
        where: { userId: user.id },
        include: {
          owner: {
            select: { id: true, name: true },
          }
        }
      });
      owners = userOwners.map(uo => uo.owner);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          phone: user.phone,
          email: user.email,
        },
        permissions: role?.permissions || {},
        owners,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ success: false, message: '令牌无效' });
  }
});

export default router;
