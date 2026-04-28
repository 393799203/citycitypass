import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { url, size = '300' } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: '缺少 url 参数'
      });
    }

    const qrSize = parseInt(size as string, 10) || 300;

    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      width: qrSize,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      data: {
        qrCode: qrCodeDataUrl,
        url: url,
        size: qrSize
      }
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({
      success: false,
      message: '生成二维码失败'
    });
  }
});

router.get('/image', async (req: Request, res: Response) => {
  try {
    const { url, size = '300' } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: '缺少 url 参数'
      });
    }

    const qrSize = parseInt(size as string, 10) || 300;

    const qrCodeBuffer = await QRCode.toBuffer(url, {
      width: qrSize,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.send(qrCodeBuffer);
  } catch (error) {
    console.error('Generate QR code image error:', error);
    res.status(500).json({
      success: false,
      message: '生成二维码失败'
    });
  }
});

router.get('/shopping', async (req: Request, res: Response) => {
  try {
    const { productId, warehouseId, ownerId } = req.query;

    const baseUrl = process.env.SHOPPING_BASE_URL || 'http://localhost:3000';

    let finalUrl: string;

    if (productId && typeof productId === 'string') {
      const detailUrl = new URL('/shop/product', baseUrl);
      detailUrl.searchParams.append('productId', productId);
      if (ownerId) {
        detailUrl.searchParams.append('ownerId', ownerId as string);
      }
      finalUrl = detailUrl.toString();
    } else {
      const shoppingUrl = new URL('/shop', baseUrl);
      if (warehouseId) {
        shoppingUrl.searchParams.append('warehouseId', warehouseId as string);
      }
      if (ownerId) {
        shoppingUrl.searchParams.append('ownerId', ownerId as string);
      }
      finalUrl = shoppingUrl.toString();
    }

    const qrCodeDataUrl = await QRCode.toDataURL(finalUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      data: {
        qrCode: qrCodeDataUrl,
        shoppingUrl: finalUrl,
        productId: productId || null,
        warehouseId: warehouseId || null,
        ownerId: ownerId || null
      }
    });
  } catch (error) {
    console.error('Generate shopping QR code error:', error);
    res.status(500).json({
      success: false,
      message: '生成购物二维码失败'
    });
  }
});

export default router;
