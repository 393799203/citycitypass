import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const CATEGORY_CODE_MAP: Record<string, string> = {
  'BAIJIU': 'BAIX',
  'PIJIU': 'PIJU',
  'YANGJIU': 'YAJU',
  'PUTAOJIU': 'PUTJ',
};

const PACKAGING_CODE_MAP: Record<string, string> = {
  '礼盒': 'L',
  '纸盒': 'H',
  '简装': 'S',
};

async function generateBundleSkuCode(packaging: string): Promise<string> {
  const packagingCode = PACKAGING_CODE_MAP[packaging] || 'X';

  const existingBundles = await prisma.bundleSKU.findMany({
    where: { packaging },
    select: { skuCode: true }
  });

  let maxSeq = 0;
  for (const b of existingBundles) {
    if (b.skuCode) {
      const match = b.skuCode.match(/_[A-Z](\d{4})$/);
      if (match) {
        const seq = parseInt(match[1]);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `B_${packagingCode}${nextSeq}`;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { name, status, ownerId } = req.query;

    const where: any = {};
    if (name) where.name = { contains: name as string };
    if (status) where.status = status;
    if (ownerId) {
      where.OR = [
        { ownerId: String(ownerId) },
        { ownerId: null },
      ];
    }

    const bundles = await prisma.bundleSKU.findMany({
      where,
      include: {
        owner: true,
        items: {
          include: {
            sku: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: bundles });
  } catch (error) {
    console.error('Get bundles error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const bundle = await prisma.bundleSKU.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!bundle) {
      return res.status(404).json({ success: false, message: '套装不存在' });
    }

    res.json({ success: true, data: bundle });
  } catch (error) {
    console.error('Get bundle error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, imageUrl, packaging, spec, price, items, status, ownerId, isVisibleToCustomer } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: '请填写必填字段' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: '请添加套装商品' });
    }

    const skuCode = await generateBundleSkuCode(packaging || '简装');

    const bundle = await prisma.bundleSKU.create({
      data: {
        name,
        skuCode,
        imageUrl: imageUrl || null,
        packaging: packaging || '',
        spec: spec || '',
        price,
        status: status || 'ACTIVE',
        isVisibleToCustomer: isVisibleToCustomer !== undefined ? isVisibleToCustomer : true,
        ownerId: ownerId || null,
        items: {
          create: items.map((item: any) => ({
            skuId: item.skuId,
            quantity: item.quantity || 1
          }))
        }
      },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    res.json({ success: true, data: bundle });
  } catch (error) {
    console.error('Create bundle error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, imageUrl, packaging, spec, price, items, status, ownerId, isVisibleToCustomer } = req.body;
    
    console.log('[Bundle Update] Request body:', { id, isVisibleToCustomer, body: req.body });

    const existing = await prisma.bundleSKU.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '套装不存在' });
    }

    await prisma.bundleSKUItem.deleteMany({ where: { bundleId: id } });

    const bundle = await prisma.bundleSKU.update({
      where: { id },
      data: {
        name,
        imageUrl: imageUrl || null,
        packaging,
        spec,
        price,
        status,
        isVisibleToCustomer: isVisibleToCustomer !== undefined ? isVisibleToCustomer : true,
        ownerId: ownerId || null,
        items: {
          create: items.map((item: any) => ({
            skuId: item.skuId,
            quantity: item.quantity || 1
          }))
        }
      },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });
    
    console.log('[Bundle Update] Updated bundle:', { id: bundle.id, isVisibleToCustomer: bundle.isVisibleToCustomer });

    res.json({ success: true, data: bundle });
  } catch (error) {
    console.error('Update bundle error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.bundleSKU.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '套装不存在' });
    }

    await prisma.bundleSKUItem.deleteMany({ where: { bundleId: id } });
    await prisma.bundleSKU.delete({ where: { id } });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Delete bundle error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
