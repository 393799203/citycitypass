import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

const updateUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR', 'WAREHOUSE_STAFF', 'DRIVER']).optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { name, role } = req.query;
    
    const where: any = {};
    if (name) where.name = { contains: String(name) };
    if (role) where.role = String(role);

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: '管理员账号不能被删除' });
    }
    
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: '用户已删除' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
