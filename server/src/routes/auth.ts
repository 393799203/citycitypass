import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { ROLE_PERMISSIONS } from '../constants/permissions';

const router = Router();

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  isAdmin: z.boolean().optional().default(false),
  phone: z.string().optional(),
  email: z.string().email().optional(),
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
      { userId: user.id },
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
          isAdmin: user.isAdmin,
          phone: user.phone,
          email: user.email,
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
    const { username, password, name, isAdmin, phone, email, ownerRoles } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userOwnerData: { ownerId: string; role: string }[] = [];
    if (ownerRoles && Array.isArray(ownerRoles)) {
      userOwnerData = ownerRoles;
    }

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        isAdmin: isAdmin || false,
        phone,
        email,
        userOwners: userOwnerData.length > 0 ? {
          create: userOwnerData,
        } : undefined,
      },
    });

    res.json({ success: true, data: { id: user.id, username: user.username, name: user.name, isAdmin: user.isAdmin } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取当前用户信息及权限
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const currentOwnerId = req.headers['x-owner-id'] as string | undefined;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        name: true,
        isAdmin: true,
        phone: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }

    // 获取用户所属的所有主体（带角色）
    let owners: any[] = [];
    let userRoleCode = '';
    if (user.isAdmin) {
      // ADMIN可以看到所有主体
      const allOwners = await prisma.owner.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      owners = allOwners.map(o => ({ ...o, role: 'ADMIN' }));
      userRoleCode = 'ADMIN';
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
      owners = userOwners.map(uo => ({
        id: uo.owner.id,
        name: uo.owner.name,
        role: uo.role,
      }));
      // 如果指定了currentOwnerId，使用该主体的角色
      if (currentOwnerId) {
        const currentOwner = owners.find(o => o.id === currentOwnerId);
        if (currentOwner) {
          userRoleCode = currentOwner.role;
        } else if (owners.length > 0) {
          userRoleCode = owners[0].role;
        }
      } else if (owners.length > 0) {
        userRoleCode = owners[0].role;
      }
    }

    // 从数据库读取角色权限
    let permissions = {};
    if (userRoleCode) {
      const role = await prisma.role.findUnique({
        where: { code: userRoleCode }
      });
      if (role) {
        permissions = role.permissions;
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          isAdmin: user.isAdmin,
          phone: user.phone,
          email: user.email,
        },
        permissions,
        owners,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ success: false, message: '令牌无效' });
  }
});

export default router;
