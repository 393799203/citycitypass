import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { shopAuthMiddleware } from '../middleware/shopAuth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 微信登录
router.post('/wechat', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: '缺少code参数' });
    }

    // TODO: 调用微信API获取openId
    // 这里需要配置微信小程序的appId和secret
    // const { openId, unionId } = await getWechatOpenId(code);
    
    // 模拟微信登录（开发环境）
    const openId = `mock_openid_${code}`;
    const unionId = `mock_unionid_${code}`;

    // 查找或创建用户
    let user = await prisma.shopUser.findUnique({
      where: { openId },
      include: { 
        customer: { 
          include: { 
            contracts: { 
              where: { 
                status: 'ACTIVE',
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
              } 
            } 
          } 
        } 
      }
    });

    if (!user) {
      user = await prisma.shopUser.create({
        data: {
          openId,
          unionId,
          nickname: '微信用户',
        },
        include: { 
          customer: { 
            include: { 
              contracts: { 
                where: { 
                  status: 'ACTIVE',
                  startDate: { lte: new Date() },
                  endDate: { gte: new Date() }
                } 
              } 
            } 
          } 
        }
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, type: 'shop' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      data: { 
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          customer: user.customer,
          hasDiscount: user.customer && user.customer.contracts.length > 0
        },
        token
      }
    });
  } catch (error) {
    console.error('Wechat login error:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 支付宝登录
router.post('/alipay', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: '缺少code参数' });
    }

    // TODO: 调用支付宝API获取userId
    // 这里需要配置支付宝的appId和私钥
    // const alipayUserId = await getAlipayUserId(code);
    
    // 模拟支付宝登录（开发环境）
    const alipayUserId = `mock_alipay_${code}`;

    // 查找或创建用户
    let user = await prisma.shopUser.findUnique({
      where: { alipayUserId },
      include: { 
        customer: { 
          include: { 
            contracts: { 
              where: { 
                status: 'ACTIVE',
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
              } 
            } 
          } 
        } 
      }
    });

    if (!user) {
      user = await prisma.shopUser.create({
        data: {
          alipayUserId,
          nickname: '支付宝用户',
        },
        include: { 
          customer: { 
            include: { 
              contracts: { 
                where: { 
                  status: 'ACTIVE',
                  startDate: { lte: new Date() },
                  endDate: { gte: new Date() }
                } 
              } 
            } 
          } 
        }
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, type: 'shop' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      data: { 
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          customer: user.customer,
          hasDiscount: user.customer && user.customer.contracts.length > 0
        },
        token
      }
    });
  } catch (error) {
    console.error('Alipay login error:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 手机号登录（游客模式）
router.post('/phone', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
      code: z.string().length(6, '验证码必须是6位').optional(),
    });

    const { phone, code } = schema.parse(req.body);

    // TODO: 验证短信验证码
    // 这里需要对接短信服务商
    // if (code) {
    //   await verifySmsCode(phone, code);
    // }

    // 查找或创建用户
    let user = await prisma.shopUser.findUnique({
      where: { phone },
      include: { 
        customer: { 
          include: { 
            contracts: { 
              where: { 
                status: 'ACTIVE',
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
              } 
            } 
          } 
        } 
      }
    });

    if (!user) {
      user = await prisma.shopUser.create({
        data: {
          phone,
          nickname: `用户${phone.slice(-4)}`,
        },
        include: { 
          customer: { 
            include: { 
              contracts: { 
                where: { 
                  status: 'ACTIVE',
                  startDate: { lte: new Date() },
                  endDate: { gte: new Date() }
                } 
              } 
            } 
          } 
        }
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, type: 'shop' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      data: { 
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          customer: user.customer,
          hasDiscount: user.customer && user.customer.contracts.length > 0
        },
        token
      }
    });
  } catch (error) {
    console.error('Phone login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 绑定企业客户
router.post('/bind-customer', shopAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).shopUser?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const schema = z.object({
      customerCode: z.string().min(1, '客户编码不能为空'),
    });

    const { customerCode } = schema.parse(req.body);

    // 查找企业客户
    const customer = await prisma.customer.findUnique({
      where: { code: customerCode },
      include: { 
        contracts: { 
          where: { 
            status: 'ACTIVE',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          } 
        } 
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }

    // 绑定关系
    const user = await prisma.shopUser.update({
      where: { id: userId },
      data: { customerId: customer.id },
      include: { 
        customer: { 
          include: { 
            contracts: { 
              where: { 
                status: 'ACTIVE',
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
              } 
            } 
          } 
        } 
      }
    });

    res.json({ 
      success: true, 
      data: {
        customer: user.customer,
        hasDiscount: user.customer && user.customer.contracts.length > 0,
        discountRate: user.customer?.contracts[0]?.discount || null
      },
      message: '绑定成功'
    });
  } catch (error) {
    console.error('Bind customer error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: '绑定失败' });
  }
});

// 获取用户信息
router.get('/me', shopAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).shopUser?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const user = await prisma.shopUser.findUnique({
      where: { id: userId },
      include: { 
        customer: { 
          include: { 
            contracts: { 
              where: { 
                status: 'ACTIVE',
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
              } 
            } 
          } 
        },
        addresses: {
          orderBy: { isDefault: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ 
      success: true, 
      data: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        customer: user.customer,
        hasDiscount: user.customer && user.customer.contracts.length > 0,
        discountRate: user.customer?.contracts[0]?.discount || null,
        addresses: user.addresses,
        defaultAddressId: user.defaultAddressId
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

// 添加收货地址
router.post('/address', shopAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).shopUser?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const schema = z.object({
      receiver: z.string().min(1, '收货人不能为空'),
      phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
      province: z.string().min(1, '省份不能为空'),
      city: z.string().min(1, '城市不能为空'),
      district: z.string().optional(),
      address: z.string().min(1, '详细地址不能为空'),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      label: z.string().optional(),
      isDefault: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    // 如果设为默认地址，先取消其他默认地址
    if (data.isDefault) {
      await prisma.shopUserAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.shopUserAddress.create({
      data: {
        ...data,
        userId,
      }
    });

    // 如果是第一个地址或设为默认，更新用户的默认地址
    if (data.isDefault || !await prisma.shopUserAddress.count({ where: { userId } })) {
      await prisma.shopUser.update({
        where: { id: userId },
        data: { defaultAddressId: address.id }
      });
    }

    res.json({ success: true, data: address });
  } catch (error) {
    console.error('Add address error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: '添加地址失败' });
  }
});

// 更新收货地址
router.put('/address/:id', shopAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).shopUser?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const schema = z.object({
      receiver: z.string().min(1, '收货人不能为空'),
      phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
      province: z.string().min(1, '省份不能为空'),
      city: z.string().min(1, '城市不能为空'),
      district: z.string().optional(),
      address: z.string().min(1, '详细地址不能为空'),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      label: z.string().optional(),
      isDefault: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    // 验证地址所有权
    const existingAddress = await prisma.shopUserAddress.findFirst({
      where: { id, userId }
    });

    if (!existingAddress) {
      return res.status(404).json({ success: false, message: '地址不存在' });
    }

    // 如果设为默认地址，先取消其他默认地址
    if (data.isDefault) {
      await prisma.shopUserAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
      
      await prisma.shopUser.update({
        where: { id: userId },
        data: { defaultAddressId: id }
      });
    }

    const address = await prisma.shopUserAddress.update({
      where: { id },
      data
    });

    res.json({ success: true, data: address });
  } catch (error) {
    console.error('Update address error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: '更新地址失败' });
  }
});

// 删除收货地址
router.delete('/address/:id', shopAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).shopUser?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    // 验证地址所有权
    const address = await prisma.shopUserAddress.findFirst({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({ success: false, message: '地址不存在' });
    }

    await prisma.shopUserAddress.delete({ where: { id } });

    // 如果删除的是默认地址，清除用户的默认地址
    if (address.isDefault) {
      await prisma.shopUser.update({
        where: { id: userId },
        data: { defaultAddressId: null }
      });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, message: '删除地址失败' });
  }
});

router.get('/orders', shopAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const shopUser = (req as any).shopUser;
    const userId = shopUser.userId;

    const orders = await prisma.order.findMany({
      where: { shopUserId: userId },
      include: {
        items: true,
        owner: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: '获取订单失败' });
  }
});

router.put('/orders/:orderId/cancel', shopAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const shopUser = (req as any).shopUser;
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, shopUserId: shopUser.userId },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (!['PENDING', 'PICKING', 'OUTBOUND_REVIEW'].includes(order.status)) {
      return res.status(400).json({ success: false, message: '当前状态无法取消' });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: '取消失败' });
  }
});

router.put('/orders/:orderId/confirm', shopAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const shopUser = (req as any).shopUser;
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, shopUserId: shopUser.userId },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ success: false, message: '当前状态无法确认收货' });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Confirm receive error:', error);
    res.status(500).json({ success: false, message: '确认失败' });
  }
});

export default router;
