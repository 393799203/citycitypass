import { Router, Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLES } from '../../constants/permissions';

const router = Router();
const prisma = new PrismaClient();

// 获取所有角色
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ success: false, message: '获取角色列表失败' });
  }
});

// 获取角色详情
router.get('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({
      where: { id }
    });
    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    res.json({ success: true, data: role });
  } catch (error) {
    console.error('获取角色详情失败:', error);
    res.status(500).json({ success: false, message: '获取角色详情失败' });
  }
});

// 创建角色
router.post('/roles',
  body('code').isString().notEmpty(),
  body('name').isString().notEmpty(),
  body('permissions').isObject(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { code, name, description, permissions } = req.body;

      // 检查角色代码是否已存在
      const existingRole = await prisma.role.findUnique({
        where: { code }
      });
      if (existingRole) {
        return res.status(400).json({ success: false, message: '角色代码已存在' });
      }

      const role = await prisma.role.create({
        data: {
          code,
          name,
          description,
          permissions,
          isDefault: false,
        }
      });

      res.json({ success: true, data: role });
    } catch (error) {
      console.error('创建角色失败:', error);
      res.status(500).json({ success: false, message: '创建角色失败' });
    }
  }
);

// 更新角色
router.put('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    // 检查是否为 ADMIN 角色
    const existingRole = await prisma.role.findUnique({ where: { id } });
    if (!existingRole) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    if (existingRole.code === 'ADMIN') {
      return res.status(400).json({ success: false, message: '系统管理员角色不能编辑' });
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        permissions,
      }
    });

    res.json({ success: true, data: role });
  } catch (error) {
    console.error('更新角色失败:', error);
    res.status(500).json({ success: false, message: '更新角色失败' });
  }
});

// 删除角色
router.delete('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查是否为默认角色
    const role = await prisma.role.findUnique({
      where: { id }
    });
    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    if (role.code === 'ADMIN') {
      return res.status(400).json({ success: false, message: '系统管理员角色不能删除' });
    }
    if (role.isDefault) {
      return res.status(400).json({ success: false, message: '默认角色不能删除' });
    }

    // 检查是否有用户使用该角色
    const usersWithRole = await prisma.user.count({
      where: { role: role.code as UserRole }
    });
    if (usersWithRole > 0) {
      return res.status(400).json({ success: false, message: '该角色下有用户，无法删除' });
    }

    await prisma.role.delete({
      where: { id }
    });

    res.json({ success: true, message: '角色删除成功' });
  } catch (error) {
    console.error('删除角色失败:', error);
    res.status(500).json({ success: false, message: '删除角色失败' });
  }
});

// 初始化默认角色
router.post('/roles/init', async (req: Request, res: Response) => {
  try {
    const existingRoles = await prisma.role.findMany();
    if (existingRoles.length > 0) {
      return res.status(400).json({ success: false, message: '角色已存在，无需初始化' });
    }

    // 创建默认角色
    const createdRoles = await prisma.role.createMany({
      data: DEFAULT_ROLES
    });

    res.json({ success: true, data: createdRoles, message: '默认角色初始化成功' });
  } catch (error) {
    console.error('初始化默认角色失败:', error);
    res.status(500).json({ success: false, message: '初始化默认角色失败' });
  }
});

// 获取所有用户
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { ownerId, role, keyword } = req.query;
    const where: any = {};

    if (role) {
      where.role = role as UserRole;
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { username: { contains: keyword as string } },
        { phone: { contains: keyword as string } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        userOwners: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // 转换数据格式
    const formattedUsers = users.map(user => ({
      ...user,
      owners: user.userOwners.map(uo => uo.owner),
      ownerIds: user.userOwners.map(uo => uo.ownerId).join(','),
    }));

    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

// 获取用户详情
router.get('/users/:id', async (req: Request, res: Response) => {
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
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
          }
        },
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({ success: false, message: '获取用户详情失败' });
  }
});

// 创建用户
router.post('/users',
  body('username').isString().notEmpty(),
  body('password').isString().isLength({ min: 6 }),
  body('name').isString().notEmpty(),
  body('role').isIn(Object.values(UserRole)),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { username, password, name, role, phone, email, ownerIds } = req.body;

      // 检查用户名是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: '用户名已存在' });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 解析 ownerIds（可能是逗号分隔的字符串）
      const ownerIdArray = ownerIds
        ? (typeof ownerIds === 'string' ? ownerIds.split(',').filter(Boolean) : ownerIds)
        : [];

      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          role,
          phone,
          email,
          userOwners: {
            create: ownerIdArray.map((ownerId: string) => ({ ownerId })),
          },
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          phone: true,
          email: true,
          createdAt: true,
        }
      });

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('创建用户失败:', error);
      res.status(500).json({ success: false, message: '创建用户失败' });
    }
  }
);

// 更新用户
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, phone, email, ownerIds } = req.body;

    // 解析 ownerIds（可能是逗号分隔的字符串）
    const ownerIdArray = ownerIds
      ? (typeof ownerIds === 'string' ? ownerIds.split(',').filter(Boolean) : ownerIds)
      : [];

    // 更新用户基本信息
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        role,
        phone,
        email,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        createdAt: true,
      }
    });

    // 删除旧的主体关联
    await prisma.userOwner.deleteMany({
      where: { userId: id }
    });

    // 创建新的主体关联
    if (ownerIdArray.length > 0) {
      await prisma.userOwner.createMany({
        data: ownerIdArray.map((ownerId: string) => ({
          userId: id,
          ownerId,
        })),
      });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ success: false, message: '更新用户失败' });
  }
});

// 修改密码
router.put('/users/:id/password',
  body('password').isString().isLength({ min: 6 }),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const { password } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword }
      });

      res.json({ success: true, message: '密码修改成功' });
    } catch (error) {
      console.error('修改密码失败:', error);
      res.status(500).json({ success: false, message: '修改密码失败' });
    }
  }
);

// 删除用户
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id }
    });
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
});

// 获取当前用户的权限
router.get('/my-permissions', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 获取角色权限
    const role = await prisma.role.findUnique({
      where: { code: user.role }
    });

    res.json({
      success: true,
      data: {
        role: user.role,
        permissions: role?.permissions || {},
      }
    });
  } catch (error) {
    console.error('获取权限失败:', error);
    res.status(500).json({ success: false, message: '获取权限失败' });
  }
});

export default router;
