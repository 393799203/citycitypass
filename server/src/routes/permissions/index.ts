import { Router, Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';

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

    // 检查是否为内置角色
    const role = await prisma.role.findUnique({
      where: { id }
    });
    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    // ADMIN 和 OWNER 不能删除
    if (role.code === 'ADMIN' || role.code === 'OWNER') {
      return res.status(400).json({ success: false, message: '系统内置角色不能删除' });
    }

    // 检查是否有用户关联该角色
    const usersWithRole = await prisma.userOwner.count({
      where: { roleId: role.id }
    });
    if (usersWithRole > 0) {
      return res.status(400).json({ success: false, message: '该角色下有用户关联，无法删除' });
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
    if (ownerId) {
      where.userOwners = {
        some: { ownerId: ownerId as string }
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        isAdmin: true,
        phone: true,
        email: true,
        userOwners: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              }
            },
            role: {
              select: {
                id: true,
                code: true,
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
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
      phone: user.phone,
      email: user.email,
      owners: user.userOwners.map(uo => ({
        ownerId: uo.owner.id,
        ownerName: uo.owner.name,
        roleId: uo.role?.id,
        roleCode: uo.role?.code,
        roleName: uo.role?.name,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
        isAdmin: true,
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
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const formattedUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
      phone: user.phone,
      email: user.email,
      owners: user.userOwners.map(uo => ({
        ownerId: uo.owner.id,
        ownerName: uo.owner.name,
        role: uo.role,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({ success: true, data: formattedUser });
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
  body('isAdmin').optional().isBoolean(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { username, password, name, isAdmin, phone, email, ownerRoles } = req.body;

      // 检查用户名是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: '用户名已存在' });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // ownerRoles: [{ownerId, roleId}]
      let userOwnerData: { ownerId: string; roleId: string }[] = [];
      if (ownerRoles && Array.isArray(ownerRoles)) {
        userOwnerData = ownerRoles;
      } else if (req.body.ownerIds) {
        const ownerIdArray = typeof req.body.ownerIds === 'string'
          ? req.body.ownerIds.split(',').filter(Boolean)
          : req.body.ownerIds;
        userOwnerData = ownerIdArray.map((ownerId: string) => ({
          ownerId,
          roleId: req.body.defaultRoleId || undefined
        }));
      }

      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          isAdmin: isAdmin || false,
          phone,
          email,
          userOwners: {
            create: userOwnerData,
          },
        },
        select: {
          id: true,
          username: true,
          name: true,
          isAdmin: true,
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
    const { name, isAdmin, phone, email, ownerRoles } = req.body;

    // ownerRoles: [{ownerId, roleId}]
    let userOwnerData: { ownerId: string; roleId: string }[] = [];
    if (ownerRoles && Array.isArray(ownerRoles)) {
      userOwnerData = ownerRoles;
    } else if (req.body.ownerIds) {
      const ownerIdArray = typeof req.body.ownerIds === 'string'
        ? req.body.ownerIds.split(',').filter(Boolean)
        : req.body.ownerIds;
      userOwnerData = ownerIdArray.map((ownerId: string) => ({
        ownerId,
        roleId: req.body.defaultRoleId || undefined
      }));
    }

    // 更新用户基本信息
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        isAdmin,
        phone,
        email,
      },
      select: {
        id: true,
        username: true,
        name: true,
        isAdmin: true,
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
    if (userOwnerData.length > 0) {
      await prisma.userOwner.createMany({
        data: userOwnerData.map((uo: { ownerId: string; roleId: string }) => ({
          userId: id,
          ownerId: uo.ownerId,
          roleId: uo.roleId,
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

    // 检查是否为ADMIN用户
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { isAdmin: true }
    });

    if (!userToDelete) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (userToDelete.isAdmin) {
      return res.status(400).json({ success: false, message: '不能删除系统管理员' });
    }

    await prisma.user.delete({
      where: { id }
    });
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
});

// 解除用户与主体的关联
router.delete('/users/:id/owner/:ownerId', async (req: Request, res: Response) => {
  try {
    const { id, ownerId } = req.params;

    await prisma.userOwner.deleteMany({
      where: {
        userId: id,
        ownerId: ownerId,
      },
    });

    res.json({ success: true, message: '已解除关联' });
  } catch (error) {
    console.error('解除关联失败:', error);
    res.status(500).json({ success: false, message: '解除关联失败' });
  }
});

// 添加用户与主体的关联
router.post('/users/:id/owner', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ownerId, role } = req.body;

    if (!ownerId || !role) {
      return res.status(400).json({ success: false, message: 'ownerId和role为必填项' });
    }

    // 检查是否已存在关联
    const existing = await prisma.userOwner.findFirst({
      where: { userId: id, ownerId }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '该用户已关联此主体' });
    }

    await prisma.userOwner.create({
      data: {
        userId: id,
        ownerId,
        role,
      },
    });

    res.json({ success: true, message: '关联成功' });
  } catch (error) {
    console.error('添加关联失败:', error);
    res.status(500).json({ success: false, message: '添加关联失败' });
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
